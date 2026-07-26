"""Unit tests for runtime_policy_service's pure, DB-free core:
compute_condition_diff(). The rest of runtime_policy_service.py (CRUD,
status transitions, compile/deploy) genuinely requires a live database
session and is verified against the real deployed Postgres instance
instead (see POLICY_STUDIO_ARCHITECTURE.md); this file covers what can be
tested in isolation, not everything the module does.
"""

from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope
from app.services.runtime_policy_service import compute_condition_diff


def _policy(conditions=(), effect=Effect.ALLOW, **overrides):
    defaults = dict(
        id="rp-1",
        name="Vendor Payment Limit",
        version=1,
        status=PolicyStatus.DRAFT,
        scope=Scope(principal="prin_1", action="vendor_payment"),
        conditions=ConditionSet(all=tuple(conditions)),
        effect=effect,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def test_identical_policies_produce_no_diff_and_unchanged_risk():
    conditions = (Condition(field="amount", operator=Operator.LTE, value=100000),)
    entries, risk, _ = compute_condition_diff(_policy(conditions), _policy(conditions))
    assert all(e.kind == "unchanged" for e in entries)
    assert risk == "unchanged"


def test_raising_a_lte_limit_is_increased_risk():
    old = _policy((Condition(field="amount", operator=Operator.LTE, value=50000),))
    new = _policy((Condition(field="amount", operator=Operator.LTE, value=100000),))
    entries, risk, reason = compute_condition_diff(old, new)
    assert any(e.kind == "modified" and e.field == "amount" for e in entries)
    assert risk == "increased"
    assert "raised" in reason or "removed" in reason


def test_lowering_a_lte_limit_is_decreased_risk():
    old = _policy((Condition(field="amount", operator=Operator.LTE, value=100000),))
    new = _policy((Condition(field="amount", operator=Operator.LTE, value=50000),))
    _, risk, _ = compute_condition_diff(old, new)
    assert risk == "decreased"


def test_raising_a_gte_threshold_is_decreased_risk():
    """gte is a floor: raising it makes the policy harder to satisfy, the
    opposite direction from raising an lte ceiling."""
    old = _policy((Condition(field="amount", operator=Operator.GTE, value=100000),))
    new = _policy((Condition(field="amount", operator=Operator.GTE, value=200000),))
    _, risk, _ = compute_condition_diff(old, new)
    assert risk == "decreased"


def test_removing_a_condition_is_increased_risk():
    old = _policy(
        (
            Condition(field="amount", operator=Operator.LTE, value=100000),
            Condition(field="vendor.approved", operator=Operator.EQ, value=True),
        )
    )
    new = _policy((Condition(field="amount", operator=Operator.LTE, value=100000),))
    entries, risk, _ = compute_condition_diff(old, new)
    assert any(e.kind == "removed" and e.field == "vendor.approved" for e in entries)
    assert risk == "increased"


def test_adding_a_condition_is_decreased_risk():
    old = _policy((Condition(field="amount", operator=Operator.LTE, value=100000),))
    new = _policy(
        (
            Condition(field="amount", operator=Operator.LTE, value=100000),
            Condition(field="vendor.approved", operator=Operator.EQ, value=True),
        )
    )
    entries, risk, _ = compute_condition_diff(old, new)
    assert any(e.kind == "added" and e.field == "vendor.approved" for e in entries)
    assert risk == "decreased"


def test_mixed_changes_are_reported_as_mixed_not_averaged_away():
    """A genuinely mixed case: the limit is raised (more permissive) while
    a new condition is simultaneously added (more restrictive), two
    changes in opposite directions, which is exactly what "mixed" is for.
    A version differing only by changes that all point the same
    direction (both tested elsewhere) is not this case."""
    old = _policy((Condition(field="amount", operator=Operator.LTE, value=100000),))
    new = _policy(
        (
            Condition(field="amount", operator=Operator.LTE, value=200000),
            Condition(field="vendor.approved", operator=Operator.EQ, value=True),
        )
    )
    _, risk, reason = compute_condition_diff(old, new)
    assert risk == "mixed"
    assert "review the condition-level diff" in reason


def test_equality_value_change_on_a_non_numeric_field_does_not_affect_risk():
    old = _policy((Condition(field="currency", operator=Operator.EQ, value="ZAR"),))
    new = _policy((Condition(field="currency", operator=Operator.EQ, value="USD"),))
    entries, risk, _ = compute_condition_diff(old, new)
    assert any(e.kind == "modified" for e in entries)
    assert risk == "unchanged"
