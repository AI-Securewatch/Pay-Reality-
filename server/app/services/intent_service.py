import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Agent, Certificate, Decision, Evidence, Intent, Policy
from app.domain.compiler.compiler import to_utc_iso
from app.domain.decision import engine as decision_engine
from app.domain.decision.scope_vocabulary import is_recognized_scope
from app.domain.evidence.signing import sign_payload
from app.opa_client import HttpOpaClient


class AgentRevokedError(Exception):
    """spec 10.4: all Intent submissions from a revoked Agent are rejected
    at the API layer with HTTP 403 before evaluation -- no Decision or
    Evidence record is created."""


class ReplayDetectedError(Exception):
    """spec 21.2: the (agent_id, nonce) pair has already been used."""


class _DbPolicyStore:
    """Adapts the `policies` table to decision_engine.PolicyStore."""

    def __init__(self, db: Session):
        self.db = db

    def get_active(self) -> decision_engine.ActivePolicy:
        policy = self.db.scalar(select(Policy).where(Policy.status == "active"))
        if policy is None:
            raise decision_engine.NoActivePolicyError()
        return decision_engine.ActivePolicy(id=str(policy.id), version=policy.version)


class _EngineOpaClient:
    """Adapts HttpOpaClient to decision_engine.OpaClient -- HttpOpaClient
    already raises the exact exception types the engine expects."""

    def __init__(self, client: HttpOpaClient):
        self._client = client

    def query(self, input_doc, timeout_ms):
        return self._client.query(input_doc, timeout_ms=timeout_ms)


def _build_evidence_payload(
    decision_id: uuid.UUID,
    agent_id: uuid.UUID,
    action: str,
    amount: float,
    matched_mandates: list[str],
    outcome: str,
    approval_outcome: str | None,
    risk_classification: str,
    approver: str | None,
) -> dict:
    """spec 17.1's Evidence payload shape, adapted to Phase 1's fields."""
    return {
        "decision_id": str(decision_id),
        "agent_id": str(agent_id),
        "action": action,
        "amount": str(amount),
        "matched_mandate_ids": sorted(matched_mandates),
        "authority_outcome": outcome,
        "approval_outcome": approval_outcome,
        "risk_classification": risk_classification,
        "approver": approver,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }


def _classify_risk(amount: float) -> str:
    """Same thresholds as the retired demo's heuristic (kept as a sensible
    default -- spec doesn't define risk-band boundaries itself, only that a
    risk_classification is recorded in Evidence, spec 17.1)."""
    if amount >= 250_000:
        return "CRITICAL"
    if amount >= 100_000:
        return "HIGH"
    if amount >= 50_000:
        return "MEDIUM"
    return "LOW"


def _evidence_status_for_outcome(outcome: str) -> str:
    """spec 8.2 EvidenceRecord.status: reflects the associated decision's
    finality, not the evidence record's own signature validity (that's
    checked separately via /verify, spec 17.5). ALLOW/DENY are final at
    creation time; HUMAN_REVIEW starts PENDING until resolved (see
    resolution_service.resolve_decision, which appends a second, VERIFIED
    or REJECTED, Evidence record once a human acts)."""
    return {"ALLOW": "VERIFIED", "DENY": "REJECTED", "HUMAN_REVIEW": "PENDING"}.get(
        outcome, "PENDING"
    )


def append_evidence(
    db: Session,
    decision_id: uuid.UUID,
    agent_id: uuid.UUID,
    action: str,
    amount: float,
    matched_mandates: list[str],
    outcome: str,
    approval_outcome: str | None = None,
    approver: str | None = None,
    status: str = "PENDING",
) -> Evidence:
    payload = _build_evidence_payload(
        decision_id,
        agent_id,
        action,
        amount,
        matched_mandates,
        outcome,
        approval_outcome,
        _classify_risk(amount),
        approver,
    )
    signature = sign_payload(
        payload, settings.evidence_signing_key_b64, settings.evidence_signing_key_id
    )
    evidence = Evidence(
        decision_id=decision_id,
        payload=payload,
        key_id=signature.key_id,
        signature=signature.value,
        # spec 8.2 EvidenceRecord.status -- distinct from Decision.status
        # (our HUMAN_REVIEW-resolution addition).
        status=status,
    )
    db.add(evidence)
    db.flush()
    return evidence


def submit_intent(
    db: Session,
    agent: Agent,
    action: str,
    amount: float,
    currency: str,
    counterparty: str | None,
    context: dict,
    requested_at: datetime,
    nonce: str,
    correlation_id: str | None,
) -> tuple[Intent, Decision, Evidence]:
    if agent.status == "revoked":
        raise AgentRevokedError(str(agent.id))

    intent = Intent(
        agent_id=agent.id,
        correlation_id=correlation_id,
        action=action,
        amount=amount,
        currency=currency,
        counterparty=counterparty,
        context=context,
        nonce=nonce,
        requested_at=requested_at,
    )
    db.add(intent)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise ReplayDetectedError(f"{agent.id}:{nonce}") from e

    # spec 10.4: a suspended Agent's intents resolve to HUMAN_REVIEW with a
    # fixed reason -- OPA is never even queried in this case, but a Decision
    # + Evidence record IS still created (preserves the evidentiary trail of
    # what was attempted while suspended).
    if agent.status == "suspended":
        decision = Decision(
            intent_id=intent.id,
            policy_id=None,
            outcome="HUMAN_REVIEW",
            reason="agent_suspended",
            evaluated_mandates=[],
        )
        db.add(decision)
        db.flush()
        evidence = append_evidence(
            db,
            decision.id,
            agent.id,
            action,
            amount,
            [],
            decision.outcome,
            status=_evidence_status_for_outcome(decision.outcome),
        )
        db.commit()
        db.refresh(intent)
        db.refresh(decision)
        return intent, decision, evidence

    # spec 9.3/12.6: an unrecognized action is ambiguous, not explicitly
    # disallowed -- HUMAN_REVIEW, never DENY, and OPA is never queried.
    if not is_recognized_scope(action):
        decision = Decision(
            intent_id=intent.id,
            policy_id=None,
            outcome="HUMAN_REVIEW",
            reason="unrecognized_action",
            evaluated_mandates=[],
        )
        db.add(decision)
        db.flush()
        evidence = append_evidence(
            db,
            decision.id,
            agent.id,
            action,
            amount,
            [],
            decision.outcome,
            status=_evidence_status_for_outcome(decision.outcome),
        )
        db.commit()
        db.refresh(intent)
        db.refresh(decision)
        return intent, decision, evidence

    engine_decision = decision_engine.evaluate(
        intent={"action": action, "amount": amount, "currency": currency},
        context={**context, "timestamp": to_utc_iso(requested_at)},
        acting_for_principal_id=str(agent.acting_for_principal_id),
        policy_store=_DbPolicyStore(db),
        opa_client=_EngineOpaClient(HttpOpaClient()),
    )

    policy_id = uuid.UUID(engine_decision.policy_id) if engine_decision.policy_id else None
    decision = Decision(
        intent_id=intent.id,
        policy_id=policy_id,
        outcome=engine_decision.outcome,
        reason=engine_decision.reason,
        evaluated_mandates=engine_decision.evaluated_mandates,
    )
    db.add(decision)
    db.flush()

    evidence = append_evidence(
        db,
        decision.id,
        agent.id,
        action,
        amount,
        engine_decision.evaluated_mandates,
        decision.outcome,
        status=_evidence_status_for_outcome(decision.outcome),
    )
    db.commit()
    db.refresh(intent)
    db.refresh(decision)
    return intent, decision, evidence


def get_decision(db: Session, decision_id: uuid.UUID) -> Decision | None:
    return db.get(Decision, decision_id)
