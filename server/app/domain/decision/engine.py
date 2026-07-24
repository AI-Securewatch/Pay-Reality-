"""Decision Engine: spec Section 16.2's algorithm, ported directly to Python.

Pure orchestration: no DB access. Callers pass in an OPA client and a
PolicyStore-like lookup for the active policy, which makes this module
unit-testable against fakes before any real OPA/DB integration exists.
"""

from dataclasses import dataclass, field
from typing import Any, Protocol


class OPATimeoutError(Exception):
    """Raised by an OpaClient implementation when a query exceeds its timeout."""


class OPAEvaluationError(Exception):
    """Raised by an OpaClient implementation for any other OPA failure."""

    def __init__(self, code: str, message: str = ""):
        self.code = code
        super().__init__(message or code)


class NoActivePolicyError(Exception):
    """Raised by a PolicyStore implementation when no Policy is active."""


@dataclass(frozen=True)
class ActivePolicy:
    id: str
    version: int


@dataclass(frozen=True)
class Decision:
    outcome: str  # "ALLOW" | "DENY" | "HUMAN_REVIEW"
    reason: str | None = None
    evaluated_mandates: list[str] = field(default_factory=list)
    policy_id: str | None = None


class OpaClient(Protocol):
    def query(self, input_doc: dict[str, Any], timeout_ms: int) -> dict[str, Any]: ...


class PolicyStore(Protocol):
    def get_active(self) -> ActivePolicy: ...


def build_opa_input(
    intent: dict[str, Any],
    context: dict[str, Any],
    acting_for_principal_id: str,
    policy_version: int,
) -> dict[str, Any]:
    return {
        "intent": intent,
        "context": context,
        "agent": {"acting_for_principal_id": acting_for_principal_id},
        "policy_version": policy_version,
    }


def evaluate(
    intent: dict[str, Any],
    context: dict[str, Any],
    acting_for_principal_id: str,
    policy_store: PolicyStore,
    opa_client: OpaClient,
    timeout_ms: int = 200,
) -> Decision:
    """Direct port of spec Section 16.2's reference algorithm.

    Fail-closed (Principle 8): any error, timeout, or missing active policy
    resolves to HUMAN_REVIEW, never ALLOW.
    """
    try:
        active_policy = policy_store.get_active()
    except NoActivePolicyError:
        return Decision(outcome="HUMAN_REVIEW", reason="no_active_policy")

    try:
        opa_input = build_opa_input(
            intent, context, acting_for_principal_id, active_policy.version
        )
        result = opa_client.query(opa_input, timeout_ms=timeout_ms)
    except OPATimeoutError:
        return Decision(outcome="HUMAN_REVIEW", reason="opa_timeout", policy_id=active_policy.id)
    except OPAEvaluationError as e:
        return Decision(
            outcome="HUMAN_REVIEW", reason=f"opa_error:{e.code}", policy_id=active_policy.id
        )

    evaluated = result.get("evaluated_mandates", [])

    if result.get("requires_review") is True:
        return Decision(
            outcome="HUMAN_REVIEW",
            reason=result.get("review_reason"),
            evaluated_mandates=evaluated,
            policy_id=active_policy.id,
        )
    if result.get("allow") is True and result.get("deny") is not True:
        return Decision(outcome="ALLOW", evaluated_mandates=evaluated, policy_id=active_policy.id)
    if result.get("deny") is True:
        return Decision(
            outcome="DENY",
            reason=result.get("deny_reason"),
            evaluated_mandates=evaluated,
            policy_id=active_policy.id,
        )

    # Anything not explicitly ALLOW or DENY is HUMAN_REVIEW (fail closed).
    return Decision(
        outcome="HUMAN_REVIEW", reason="undetermined", policy_id=active_policy.id
    )
