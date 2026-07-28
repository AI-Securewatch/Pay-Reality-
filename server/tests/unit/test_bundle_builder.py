from datetime import datetime, timezone

from app.domain.compiler_v2.bundle_builder import build_bundle
from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope

FIXED_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _policy(policy_id="rp-1", effect=Effect.ALLOW, amount=100000, **overrides):
    defaults = dict(
        id=policy_id,
        name="Vendor Payment",
        version=1,
        status=PolicyStatus.APPROVED,
        scope=Scope(principal="prin_1", action="vendor_payment"),
        conditions=ConditionSet(
            all=(Condition(field="amount", operator=Operator.LTE, value=amount),)
        ),
        effect=effect,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def test_bundle_contains_one_rule_per_policy():
    bundle = build_bundle([_policy("rp-1"), _policy("rp-2")], "bundle-1", 1, now=FIXED_NOW)
    assert "policy_rp_1 if {" in bundle.rego_source
    assert "policy_rp_2 if {" in bundle.rego_source


def test_allow_effect_policy_generates_allow_aggregate_line():
    bundle = build_bundle([_policy("rp-1", effect=Effect.ALLOW)], "bundle-1", 1, now=FIXED_NOW)
    assert "allow if { policy_rp_1 }" in bundle.rego_source


def test_deny_effect_policy_generates_deny_aggregate_line():
    bundle = build_bundle([_policy("rp-1", effect=Effect.DENY)], "bundle-1", 1, now=FIXED_NOW)
    assert "deny if { policy_rp_1 }" in bundle.rego_source


def test_review_effect_policy_generates_requires_review_aggregate_line():
    bundle = build_bundle(
        [_policy("rp-1", effect=Effect.REQUIRE_HUMAN_REVIEW)], "bundle-1", 1, now=FIXED_NOW
    )
    assert "requires_review if { policy_rp_1 }" in bundle.rego_source


def test_evaluated_mandates_field_name_is_reused_for_engine_compatibility():
    """domain/decision/engine.py reads result.get("evaluated_mandates", [])
    and is not being modified in this phase; the bundle must keep using
    that exact field name for a future integration to be a no-op on the
    engine's side."""
    bundle = build_bundle([_policy("rp-1")], "bundle-1", 1, now=FIXED_NOW)
    assert 'evaluated_mandates contains "rp-1" if { policy_rp_1 }' in bundle.rego_source


def test_fallback_deny_when_nothing_matches_is_present():
    bundle = build_bundle([_policy("rp-1")], "bundle-1", 1, now=FIXED_NOW)
    assert "deny if { count(evaluated_mandates) == 0 }" in bundle.rego_source


def test_compiling_twice_is_byte_identical():
    policies = [_policy("rp-1")]
    b1 = build_bundle(policies, "bundle-1", 1, now=FIXED_NOW)
    b2 = build_bundle(policies, "bundle-1", 1, now=FIXED_NOW)
    assert b1.bundle_hash == b2.bundle_hash
    assert b1.rego_source == b2.rego_source


def test_bundle_hash_is_stable_across_different_compile_times():
    """The regression this guards: compile_policy and deploy_policy both
    call build_bundle with no fixed `now` (real wall-clock time), at two
    genuinely different instants. If compiled_at were part of the hash,
    this would always fail in production even when nothing about the
    policies changed -- exactly what made deploy_policy's staleness
    check (bundle_hash != row.bundle_hash) reject every single deploy.
    test_compiling_twice_is_byte_identical alone didn't catch this: it
    passes the same FIXED_NOW to both calls, so a timestamp-sensitive
    hash would still match there."""
    policies = [_policy("rp-1")]
    b1 = build_bundle(policies, "bundle-1", 1, now=datetime(2026, 1, 1, tzinfo=timezone.utc))
    b2 = build_bundle(policies, "bundle-1", 1, now=datetime(2026, 6, 15, tzinfo=timezone.utc))
    assert b1.bundle_hash == b2.bundle_hash


def test_bundle_hash_changes_when_a_condition_value_changes():
    b1 = build_bundle([_policy("rp-1", amount=100000)], "bundle-1", 1, now=FIXED_NOW)
    b2 = build_bundle([_policy("rp-1", amount=200000)], "bundle-1", 1, now=FIXED_NOW)
    assert b1.bundle_hash != b2.bundle_hash


def test_manifest_lists_every_policy():
    bundle = build_bundle([_policy("rp-1"), _policy("rp-2")], "bundle-1", 1, now=FIXED_NOW)
    ids = {p["id"] for p in bundle.manifest["policies"]}
    assert ids == {"rp-1", "rp-2"}


def test_manifest_records_compiler_version():
    bundle = build_bundle([_policy("rp-1")], "bundle-1", 1, now=FIXED_NOW)
    assert bundle.manifest["compiler_version"] == bundle.compiler_version


def test_bundle_with_zero_policies_still_compiles():
    bundle = build_bundle([], "bundle-empty", 1, now=FIXED_NOW)
    assert bundle.runtime_policy_ids == ()
    assert "package payreality.authorization" in bundle.rego_source
