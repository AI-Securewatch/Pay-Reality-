"""Policy Compiler — spec Section 12.4 Stage 6.

Converts approved Authority records into Mandate/Constraint records and a
Rego bundle + bundle_hash. Pure function of its inputs: the same approved
Authority set, compiled twice, must produce byte-identical Rego and an
identical bundle_hash (spec 12.4 Stage 6's determinism guarantee).

The "bundle" here is (rego_source, mandates_data) pushed into OPA via its
management API (see app.opa_client) rather than a signed bundle+manifest
served over OPA's native bundle-polling mechanism -- a deliberate Phase 1
simplification. bundle_hash is our own compile-time integrity record (used
for policy versioning and Evidence per spec 14.5), not something round-
tripped through OPA's bundle-signature feature.
"""

import hashlib
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

DUAL_APPROVAL_PATTERN = re.compile(r"^requires_dual_approval_above_(\d+(?:\.\d+)?)$")

# Mandates without an extracted expiry default to a wide validity window --
# Phase 1 authority documents rarely specify one, and Authority (spec 8.2)
# has no valid_from/valid_to fields to carry forward even when they do.
DEFAULT_VALIDITY = timedelta(days=365 * 5)


class CompilationConflictError(Exception):
    """Raised when two approved Authority records produce Constraints the
    compiler cannot represent unambiguously (spec 12.4 Stage 6 failure mode).
    Compilation must fail closed: the Policy stays draft, never partially
    compiled."""

    def __init__(self, message: str, conflicting_authority_ids: list[str]):
        self.conflicting_authority_ids = conflicting_authority_ids
        super().__init__(message)


@dataclass(frozen=True)
class CompiledAuthority:
    """The subset of an approved Authority row the compiler needs -- kept
    separate from the SQLAlchemy model so this module has no DB dependency."""

    id: str
    principal_id: str
    scope: str
    limit_amount: float | None
    currency: str | None
    conditions: list[Any]


@dataclass(frozen=True)
class CompiledMandate:
    id: str
    authority_id: str
    principal_id: str
    scope: str
    max_amount: float | None
    currency: str | None
    review_threshold: float | None
    valid_from: datetime
    valid_to: datetime


@dataclass(frozen=True)
class CompiledConstraint:
    id: str
    mandate_id: str
    type: str
    value: Any


@dataclass(frozen=True)
class CompilationResult:
    mandates: list[CompiledMandate]
    constraints: list[CompiledConstraint]
    rego_source: str
    mandates_data: list[dict[str, Any]]
    bundle_hash: str


def _parse_conditions(conditions: list[Any]) -> tuple[float | None, list[dict[str, Any]]]:
    """Returns (review_threshold, extra_constraints). Recognizes the
    "requires_dual_approval_above_N" vocabulary from spec 8.2's example;
    anything else becomes an opaque "custom" Constraint, never silently
    dropped."""
    review_threshold: float | None = None
    extra: list[dict[str, Any]] = []
    for cond in conditions:
        if isinstance(cond, str):
            match = DUAL_APPROVAL_PATTERN.match(cond)
            if match:
                review_threshold = float(match.group(1))
                continue
            extra.append({"type": "custom", "value": cond})
        else:
            extra.append({"type": "custom", "value": cond})
    return review_threshold, extra


def _check_conflicts(authorities: list[CompiledAuthority]) -> None:
    """Two approved Authority records for the same (principal_id, scope)
    with different max_amount cannot be represented as one unambiguous
    Mandate -- spec 12.4 Stage 6's named failure mode."""
    seen: dict[tuple[str, str], CompiledAuthority] = {}
    conflicts: list[str] = []
    for auth in authorities:
        key = (auth.principal_id, auth.scope)
        prior = seen.get(key)
        if prior is not None and prior.limit_amount != auth.limit_amount:
            conflicts.extend([prior.id, auth.id])
        else:
            seen[key] = auth
    if conflicts:
        raise CompilationConflictError(
            "Conflicting max_amount for the same principal/scope pair with no "
            "precedence rule (spec 12.4 Stage 6)",
            conflicting_authority_ids=sorted(set(conflicts)),
        )


REGO_TEMPLATE = """package payreality.authorization

default allow := false
default deny := false
default requires_review := false

# ALLOW: intent falls within an active, matching mandate below the review threshold
allow if {
	m := matching_mandate[_]
	input.intent.amount <= m.max_amount
	not review_band_exceeded(m)
	input.intent.currency == m.currency
}

# HUMAN_REVIEW: within mandate limit but above the dual-control threshold
requires_review if {
	m := matching_mandate[_]
	input.intent.amount <= m.max_amount
	review_band_exceeded(m)
}

review_reason := "dual_control_threshold_exceeded" if requires_review

# DENY: exceeds every matching mandate's max_amount, or no mandate matches scope
deny if {
	count(matching_mandate) > 0
	every m in matching_mandate {
		input.intent.amount > m.max_amount
	}
}

deny if {
	count(matching_mandate) == 0
}

deny_reason := "amount_exceeds_mandate_limit" if {
	deny
	count(matching_mandate) > 0
}

deny_reason := "no_mandate_covers_scope" if {
	deny
	count(matching_mandate) == 0
}

evaluated_mandates := [m.id | m := matching_mandate[_]]

review_band_exceeded(m) if {
	m.review_threshold != null
	input.intent.amount >= m.review_threshold
}

matching_mandate contains m if {
	m := data.mandates[_]
	m.scope == input.intent.action
	m.principal_id == input.agent.acting_for_principal_id
	m.valid_from <= input.context.timestamp
	m.valid_to >= input.context.timestamp
}
"""


def to_utc_iso(dt: datetime) -> str:
    """Normalize to a UTC-offset ISO8601 string.

    Required because the compiled Rego compares mandate validity windows
    against the intent timestamp with plain string `<=`/`>=` (spec 16.3),
    which is lexicographic, not chronological. Two otherwise-correct ISO8601
    timestamps with different UTC offsets (e.g. "...19:49:27+02:00" vs
    "...17:50:49+00:00") do NOT compare correctly as strings even though
    they represent nearby instants -- every timestamp that ever reaches a
    Rego comparison must be rendered in this exact same offset for
    lexicographic order to match chronological order.
    """
    return dt.astimezone(timezone.utc).isoformat()


def _canonical_bytes(rego_source: str, mandates_data: list[dict[str, Any]]) -> bytes:
    import json

    payload = {
        "rego": rego_source,
        "mandates": mandates_data,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def compile_authorities(
    authorities: list[CompiledAuthority],
    policy_version: int,
    now: datetime | None = None,
) -> CompilationResult:
    """spec 12.4 Stage 6. Raises CompilationConflictError on unresolvable
    conflicts -- callers must leave the Policy row in `draft` on that path.

    Mandate/Constraint ids are derived deterministically (uuid5, not
    uuid4) from (policy_version, authority_id) rather than authority_id
    alone. Two reasons: (1) "the same Authority set compiled twice produces
    an identical bundle_hash" (spec 12.4 Stage 6) requires non-random ids;
    (2) a Mandate "belongs to exactly one Policy version" (spec 8.2) -- an
    Authority approved once but compiled into two different Policy
    versions must get two distinct Mandate rows, not a duplicate-key
    collision on the second compile.
    """
    _check_conflicts(authorities)

    now = now or datetime.now(timezone.utc)
    valid_from = now
    valid_to = now + DEFAULT_VALIDITY

    mandates: list[CompiledMandate] = []
    constraints: list[CompiledConstraint] = []

    for auth in authorities:
        review_threshold, extra_constraints = _parse_conditions(auth.conditions)
        mandate_id = str(
            uuid.uuid5(uuid.NAMESPACE_OID, f"mandate:{policy_version}:{auth.id}")
        )
        mandates.append(
            CompiledMandate(
                id=mandate_id,
                authority_id=auth.id,
                principal_id=auth.principal_id,
                scope=auth.scope,
                max_amount=auth.limit_amount,
                currency=auth.currency,
                review_threshold=review_threshold,
                valid_from=valid_from,
                valid_to=valid_to,
            )
        )
        for idx, c in enumerate(extra_constraints):
            constraint_id = str(
                uuid.uuid5(uuid.NAMESPACE_OID, f"constraint:{mandate_id}:{idx}")
            )
            constraints.append(
                CompiledConstraint(
                    id=constraint_id, mandate_id=mandate_id, type=c["type"], value=c["value"]
                )
            )

    mandates_data = [
        {
            "id": m.id,
            "principal_id": m.principal_id,
            "scope": m.scope,
            "max_amount": float(m.max_amount) if m.max_amount is not None else None,
            "currency": m.currency,
            "review_threshold": float(m.review_threshold)
            if m.review_threshold is not None
            else None,
            "valid_from": to_utc_iso(m.valid_from),
            "valid_to": to_utc_iso(m.valid_to),
        }
        for m in mandates
    ]

    bundle_hash = "sha256:" + hashlib.sha256(
        _canonical_bytes(REGO_TEMPLATE, mandates_data)
    ).hexdigest()

    return CompilationResult(
        mandates=mandates,
        constraints=constraints,
        rego_source=REGO_TEMPLATE,
        mandates_data=mandates_data,
        bundle_hash=bundle_hash,
    )
