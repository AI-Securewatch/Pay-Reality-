from datetime import datetime, timezone

from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.constraints import Constraints, RiskLevel
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.metadata import AuditTrail, Metadata
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope
from app.domain.runtime_policy.schema import canonical_json, from_dict, to_dict
from app.domain.runtime_policy.validators import validate

FIXED_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _policy(**overrides) -> RuntimePolicy:
    defaults = dict(
        id="rp_1",
        name="Vendor Payment",
        version=1,
        status=PolicyStatus.DRAFT,
        scope=Scope(principal="prin_1", action="vendor_payment"),
        conditions=ConditionSet(
            all=(
                Condition(field="amount", operator=Operator.LTE, value=100000),
                Condition(field="currency", operator=Operator.EQ, value="ZAR"),
                Condition(field="vendor.approved", operator=Operator.EQ, value=True),
            )
        ),
        effect=Effect.ALLOW,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def test_valid_policy_passes_validation():
    result = validate(_policy())
    assert result.ok
    assert result.errors == ()


def test_missing_name_is_a_validation_error_not_an_exception():
    result = validate(_policy(name=""))
    assert not result.ok
    assert any(e.code == "REQUIRED_FIELD_MISSING" and e.field == "name" for e in result.errors)


def test_missing_scope_principal_and_action_are_both_reported():
    result = validate(_policy(scope=Scope(principal="", action="")))
    codes = {(e.field, e.code) for e in result.errors}
    assert ("scope.principal", "INVALID_SCOPE") in codes
    assert ("scope.action", "INVALID_SCOPE") in codes


def test_version_below_one_is_invalid():
    result = validate(_policy(version=0))
    assert any(e.code == "INVALID_VERSION" for e in result.errors)


def test_duplicate_conditions_are_detected():
    dup = Condition(field="amount", operator=Operator.LTE, value=100000)
    result = validate(_policy(conditions=ConditionSet(all=(dup, dup))))
    assert any(e.code == "DUPLICATE_CONDITION" for e in result.errors)


def test_numeric_operator_with_non_numeric_value_is_rejected():
    bad = Condition(field="amount", operator=Operator.LTE, value="a lot")
    result = validate(_policy(conditions=ConditionSet(all=(bad,))))
    assert any(e.code == "OPERATOR_VALUE_MISMATCH" for e in result.errors)


def test_numeric_operator_with_boolean_value_is_rejected():
    """bool is a subclass of int in Python; isinstance(True, int) is True.
    A numeric operator must still reject a boolean value, not silently
    accept it because it happens to satisfy isinstance(..., int)."""
    bad = Condition(field="amount", operator=Operator.LTE, value=True)
    result = validate(_policy(conditions=ConditionSet(all=(bad,))))
    assert any(e.code == "OPERATOR_VALUE_MISMATCH" for e in result.errors)


def test_in_operator_requires_a_list_value():
    bad = Condition(field="currency", operator=Operator.IN, value="ZAR")
    result = validate(_policy(conditions=ConditionSet(all=(bad,))))
    assert any(e.code == "OPERATOR_VALUE_MISMATCH" for e in result.errors)


def test_in_operator_with_list_value_is_valid():
    ok = Condition(field="currency", operator=Operator.IN, value=["ZAR", "USD"])
    result = validate(_policy(conditions=ConditionSet(all=(ok,))))
    assert result.ok


def test_duplicate_tags_are_detected():
    result = validate(_policy(metadata=Metadata(tags=("urgent", "urgent"))))
    assert any(e.code == "INVALID_METADATA" for e in result.errors)


def test_empty_tag_is_detected():
    result = validate(_policy(metadata=Metadata(tags=("",))))
    assert any(e.code == "INVALID_METADATA" for e in result.errors)


def test_serialization_round_trips():
    original = _policy(
        description="A test policy",
        constraints=Constraints(
            delegated_by="controller_1",
            expires=FIXED_NOW,
            evidence_required=True,
            risk_level=RiskLevel.HIGH,
        ),
        metadata=Metadata(owner="finance_team", created_by="alice", tags=("pilot",)),
        audit=AuditTrail(created=FIXED_NOW, modified=None, approved=None, deployed=None),
    )
    restored = from_dict(to_dict(original))
    assert restored == original


def test_canonical_json_is_deterministic():
    policy = _policy()
    assert canonical_json(policy) == canonical_json(policy)


def test_canonical_json_changes_when_a_condition_changes():
    a = canonical_json(_policy())
    b = canonical_json(
        _policy(
            conditions=ConditionSet(
                all=(Condition(field="amount", operator=Operator.LTE, value=999),)
            )
        )
    )
    assert a != b


def test_canonical_json_is_stable_across_independently_constructed_equal_policies():
    """Two separately built RuntimePolicy values with identical content
    must hash identically: the actual guarantee this exists to serve
    (comparable to compiler.py's bundle_hash determinism requirement)."""
    p1 = _policy()
    p2 = _policy()
    assert canonical_json(p1) == canonical_json(p2)
