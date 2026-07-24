from datetime import datetime, timezone

import pytest

from app.domain.compiler.compiler import (
    CompilationConflictError,
    CompiledAuthority,
    compile_authorities,
)

FIXED_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _auth(**overrides) -> CompiledAuthority:
    defaults = dict(
        id="auth_1",
        principal_id="prin_1",
        scope="vendor_payment",
        limit_amount=50000.0,
        currency="USD",
        conditions=["requires_dual_approval_above_25000"],
    )
    defaults.update(overrides)
    return CompiledAuthority(**defaults)


def test_compiling_twice_is_byte_identical():
    authorities = [_auth()]
    r1 = compile_authorities(authorities, policy_version=1, now=FIXED_NOW)
    r2 = compile_authorities(authorities, policy_version=1, now=FIXED_NOW)
    assert r1.bundle_hash == r2.bundle_hash
    assert r1.rego_source == r2.rego_source
    assert r1.mandates_data == r2.mandates_data


def test_bundle_hash_changes_when_authority_content_changes():
    r1 = compile_authorities([_auth(limit_amount=50000.0)], policy_version=1, now=FIXED_NOW)
    r2 = compile_authorities([_auth(limit_amount=60000.0)], policy_version=1, now=FIXED_NOW)
    assert r1.bundle_hash != r2.bundle_hash


def test_dual_approval_condition_becomes_review_threshold():
    result = compile_authorities([_auth()], policy_version=1, now=FIXED_NOW)
    assert len(result.mandates) == 1
    assert result.mandates[0].review_threshold == 25000.0
    # the condition was fully consumed into review_threshold, not also
    # duplicated as an opaque constraint
    assert result.constraints == []


def test_unrecognized_condition_becomes_custom_constraint_not_dropped():
    result = compile_authorities(
        [_auth(conditions=["only_business_hours"])], policy_version=1, now=FIXED_NOW
    )
    assert result.mandates[0].review_threshold is None
    assert len(result.constraints) == 1
    assert result.constraints[0].type == "custom"
    assert result.constraints[0].value == "only_business_hours"


def test_mandate_ids_are_deterministic_across_compilations_of_the_same_version():
    r1 = compile_authorities([_auth()], policy_version=1, now=FIXED_NOW)
    r2 = compile_authorities([_auth()], policy_version=1, now=FIXED_NOW)
    assert r1.mandates[0].id == r2.mandates[0].id


def test_mandate_ids_differ_across_policy_versions_for_the_same_authority():
    """Regression test: an Authority approved once but compiled into two
    different Policy versions must get two distinct Mandate ids, not a
    duplicate-key collision when both versions' rows exist in the DB at
    once (spec 8.2: a Mandate belongs to exactly one Policy version)."""
    r1 = compile_authorities([_auth()], policy_version=1, now=FIXED_NOW)
    r2 = compile_authorities([_auth()], policy_version=2, now=FIXED_NOW)
    assert r1.mandates[0].id != r2.mandates[0].id


def test_conflicting_authorities_same_principal_scope_different_amount_raises():
    authorities = [
        _auth(id="auth_1", limit_amount=50000.0),
        _auth(id="auth_2", limit_amount=75000.0),
    ]
    with pytest.raises(CompilationConflictError) as exc_info:
        compile_authorities(authorities, policy_version=1, now=FIXED_NOW)
    assert set(exc_info.value.conflicting_authority_ids) == {"auth_1", "auth_2"}


def test_same_principal_scope_same_amount_is_not_a_conflict():
    authorities = [
        _auth(id="auth_1", limit_amount=50000.0),
        _auth(id="auth_2", limit_amount=50000.0),
    ]
    # should not raise
    result = compile_authorities(authorities, policy_version=1, now=FIXED_NOW)
    assert len(result.mandates) == 2


def test_different_scope_same_principal_is_not_a_conflict():
    authorities = [
        _auth(id="auth_1", scope="vendor_payment", limit_amount=50000.0),
        _auth(id="auth_2", scope="purchase_order_create", limit_amount=999.0),
    ]
    result = compile_authorities(authorities, policy_version=1, now=FIXED_NOW)
    assert len(result.mandates) == 2


def test_rego_source_contains_expected_rule_names():
    result = compile_authorities([_auth()], policy_version=1, now=FIXED_NOW)
    for rule in ("allow", "deny", "requires_review", "evaluated_mandates", "matching_mandate"):
        assert rule in result.rego_source
