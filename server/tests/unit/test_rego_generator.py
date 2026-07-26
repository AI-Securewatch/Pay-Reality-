from app.domain.compiler_v2.rego_generator import (
    effect_rule_name,
    generate_condition_expression,
    generate_policy_rule,
    generate_scope_block,
    rule_name_for_policy,
    sanitize_policy_id,
)
from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope


def _policy(**overrides) -> RuntimePolicy:
    defaults = dict(
        id="rp-1",
        name="Vendor Payment",
        version=1,
        status=PolicyStatus.APPROVED,
        scope=Scope(principal="prin_1", action="vendor_payment"),
        conditions=ConditionSet(
            all=(
                Condition(field="amount", operator=Operator.LTE, value=100000),
                Condition(field="currency", operator=Operator.EQ, value="ZAR"),
            )
        ),
        effect=Effect.ALLOW,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def test_sanitize_policy_id_replaces_invalid_characters():
    assert sanitize_policy_id("rp-1") == "rp_1"
    assert sanitize_policy_id("rp.1.2") == "rp_1_2"


def test_sanitize_policy_id_handles_leading_digit():
    assert sanitize_policy_id("1abc") == "p_1abc"


def test_rule_name_for_policy_is_deterministic():
    assert rule_name_for_policy("rp-1") == "policy_rp_1"
    assert rule_name_for_policy("rp-1") == rule_name_for_policy("rp-1")


def test_effect_rule_name_maps_all_three_effects():
    assert effect_rule_name(Effect.ALLOW) == "allow"
    assert effect_rule_name(Effect.DENY) == "deny"
    assert effect_rule_name(Effect.REQUIRE_HUMAN_REVIEW) == "requires_review"


def test_comparison_operators_generate_expected_rego():
    cases = [
        (Operator.LTE, 100000, "input.intent.amount <= 100000"),
        (Operator.GTE, 5, "input.intent.amount >= 5"),
        (Operator.EQ, "ZAR", 'input.intent.amount == "ZAR"'),
        (Operator.NEQ, "USD", 'input.intent.amount != "USD"'),
        (Operator.LT, 10, "input.intent.amount < 10"),
        (Operator.GT, 1, "input.intent.amount > 1"),
    ]
    for op, value, expected in cases:
        condition = Condition(field="amount", operator=op, value=value)
        assert generate_condition_expression(condition) == expected


def test_in_operator_generates_membership_expression():
    condition = Condition(field="currency", operator=Operator.IN, value=["ZAR", "USD"])
    assert generate_condition_expression(condition) == 'input.intent.currency in ["ZAR", "USD"]'


def test_contains_operator_generates_builtin_call():
    condition = Condition(field="name", operator=Operator.CONTAINS, value="vendor")
    assert generate_condition_expression(condition) == 'contains(input.intent.name, "vendor")'


def test_exists_true_generates_not_null_check():
    condition = Condition(field="vendor.approved", operator=Operator.EXISTS, value=True)
    result = generate_condition_expression(condition)
    assert result == (
        'object.get(object.get(input.intent, "vendor", {}), "approved", null) != null'
    )


def test_exists_false_generates_null_check():
    condition = Condition(field="vendor.approved", operator=Operator.EXISTS, value=False)
    result = generate_condition_expression(condition)
    assert result == (
        'object.get(object.get(input.intent, "vendor", {}), "approved", null) == null'
    )


def test_string_values_are_safely_escaped():
    condition = Condition(field="name", operator=Operator.EQ, value='has "quotes" inside')
    result = generate_condition_expression(condition)
    assert result == 'input.intent.name == "has \\"quotes\\" inside"'


def test_scope_block_includes_action_and_principal():
    policy = _policy()
    lines = generate_scope_block(policy)
    assert 'input.intent.action == "vendor_payment"' in lines
    assert 'input.agent.acting_for_principal_id == "prin_1"' in lines


def test_scope_block_includes_agent_when_present():
    policy = _policy(scope=Scope(principal="prin_1", action="vendor_payment", agent="agent_5"))
    lines = generate_scope_block(policy)
    assert 'input.agent.id == "agent_5"' in lines


def test_scope_block_omits_agent_when_absent():
    policy = _policy()
    lines = generate_scope_block(policy)
    assert not any("input.agent.id" in line for line in lines)


def test_generate_policy_rule_wraps_scope_and_conditions_in_one_rule():
    policy = _policy()
    rule = generate_policy_rule(policy)
    assert rule.startswith("policy_rp_1 if {")
    assert 'input.intent.action == "vendor_payment"' in rule
    assert "input.intent.amount <= 100000" in rule
    assert rule.strip().endswith("}")
