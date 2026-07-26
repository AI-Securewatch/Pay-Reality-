from datetime import datetime, timezone

from app.domain.compiler_v2.compiler_errors import (
    CONFLICTING_POLICY_STRUCTURE,
    INVALID_ACTION,
    INVALID_RESOURCE,
    INVALID_RUNTIME_POLICY,
)
from app.domain.compiler_v2.compiler_v2 import FinancialVocabulary, compile_bundle
from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope

FIXED_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _policy(**overrides) -> RuntimePolicy:
    defaults = dict(
        id="rp-1",
        name="Vendor Payment",
        version=1,
        status=PolicyStatus.APPROVED,
        scope=Scope(principal="prin_1", action="vendor_payment"),
        conditions=ConditionSet(
            all=(Condition(field="amount", operator=Operator.LTE, value=100000),)
        ),
        effect=Effect.ALLOW,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def test_successful_compilation_produces_a_bundle_with_no_errors():
    result = compile_bundle([_policy()], "bundle-1", 1, now=FIXED_NOW)
    assert result.ok
    assert result.bundle is not None
    assert result.diagnostics.ok


def test_unrecognized_action_is_rejected():
    result = compile_bundle(
        [_policy(scope=Scope(principal="prin_1", action="do_something_unknown"))],
        "bundle-1",
        1,
        now=FIXED_NOW,
    )
    assert not result.ok
    assert result.bundle is None
    assert any(e.code == INVALID_ACTION for e in result.diagnostics.errors)


def test_recognized_actions_all_pass_the_default_financial_vocabulary():
    for action in ("vendor_payment", "purchase_order_create", "wire_transfer"):
        result = compile_bundle(
            [_policy(scope=Scope(principal="prin_1", action=action))],
            "bundle-1",
            1,
            now=FIXED_NOW,
        )
        assert result.ok, f"{action} should be a recognized action"


def test_blank_resource_is_rejected():
    result = compile_bundle(
        [_policy(scope=Scope(principal="prin_1", action="vendor_payment", resource="   "))],
        "bundle-1",
        1,
        now=FIXED_NOW,
    )
    assert not result.ok
    assert any(e.code == INVALID_RESOURCE for e in result.diagnostics.errors)


def test_malformed_runtime_policy_is_reported_not_raised():
    """An empty name is a Phase 1 validators.py failure; compile_bundle
    must surface it as a diagnostic, never let validators.py's exception
    contract (never raises) become an exception here either."""
    result = compile_bundle([_policy(name="")], "bundle-1", 1, now=FIXED_NOW)
    assert not result.ok
    assert any(e.code == INVALID_RUNTIME_POLICY for e in result.diagnostics.errors)


def test_conflicting_numeric_limits_for_same_principal_and_action_are_detected():
    p1 = _policy(
        id="rp-1",
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.LTE, value=100000),)),
    )
    p2 = _policy(
        id="rp-2",
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.LTE, value=50000),)),
    )
    result = compile_bundle([p1, p2], "bundle-1", 1, now=FIXED_NOW)
    assert not result.ok
    assert any(e.code == CONFLICTING_POLICY_STRUCTURE for e in result.diagnostics.errors)


def test_contradictory_equality_conditions_are_detected():
    p1 = _policy(
        id="rp-1",
        conditions=ConditionSet(all=(Condition(field="currency", operator=Operator.EQ, value="ZAR"),)),
    )
    p2 = _policy(
        id="rp-2",
        conditions=ConditionSet(all=(Condition(field="currency", operator=Operator.EQ, value="USD"),)),
    )
    result = compile_bundle([p1, p2], "bundle-1", 1, now=FIXED_NOW)
    assert not result.ok
    assert any(e.code == CONFLICTING_POLICY_STRUCTURE for e in result.diagnostics.errors)


def test_non_overlapping_scope_does_not_trigger_conflict_detection():
    p1 = _policy(id="rp-1", scope=Scope(principal="prin_1", action="vendor_payment"))
    p2 = _policy(id="rp-2", scope=Scope(principal="prin_2", action="vendor_payment"))
    result = compile_bundle([p1, p2], "bundle-1", 1, now=FIXED_NOW)
    assert result.ok


def test_different_fields_do_not_trigger_conflict_detection():
    """Explicitly out of scope per COMPILER_V2_ARCHITECTURE.md: two
    policies constraining different fields for the same principal/action
    are not analyzed for cross-field tension, only named as a limit."""
    p1 = _policy(
        id="rp-1",
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.LTE, value=100000),)),
    )
    p2 = _policy(
        id="rp-2",
        conditions=ConditionSet(
            all=(Condition(field="vendor.approved", operator=Operator.EQ, value=True),)
        ),
    )
    result = compile_bundle([p1, p2], "bundle-1", 1, now=FIXED_NOW)
    assert result.ok


def test_custom_vocabulary_can_be_injected():
    class ToyVocabulary:
        def is_valid_action(self, action: str) -> bool:
            return action == "grant_access"

    result = compile_bundle(
        [_policy(scope=Scope(principal="prin_1", action="grant_access"))],
        "bundle-1",
        1,
        vocabulary=ToyVocabulary(),
        now=FIXED_NOW,
    )
    assert result.ok


def test_financial_vocabulary_matches_todays_known_scopes():
    """Cross-check against scope_vocabulary.py's actual current content,
    so this default can never silently drift from the one real adapter
    that exists."""
    from app.domain.decision.scope_vocabulary import KNOWN_SCOPES

    assert FinancialVocabulary().known_actions == KNOWN_SCOPES
