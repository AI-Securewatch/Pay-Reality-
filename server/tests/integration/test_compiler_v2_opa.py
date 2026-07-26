"""Integration tests against a real, ephemeral OPA server (see conftest.py
for how it's started and why these tests skip cleanly when no `opa`
binary is available rather than failing).

The most important test in this file, test_unmodified_decision_engine_
consumes_compiler_v2_output, is the actual proof behind this phase's
central claim: "the Runtime Authority Engine must never know where a
policy came from." It runs a Compiler V2 bundle through
domain/decision/engine.py's real, completely unmodified evaluate()
function, imported directly, not reimplemented or mocked, to demonstrate
that engine.py needs zero changes to consume this compiler's output.
"""

import httpx

from app.domain.compiler_v2.bundle_builder import build_bundle
from app.domain.compiler_v2.dry_run import dry_run
from app.domain.decision import engine as decision_engine
from app.domain.runtime_policy.conditions import Condition, ConditionSet, Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import PolicyStatus, RuntimePolicy, Scope
from app.opa_client import DATA_PATH


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
                Condition(field="vendor.approved", operator=Operator.EQ, value=True),
            )
        ),
        effect=Effect.ALLOW,
    )
    defaults.update(overrides)
    return RuntimePolicy(**defaults)


def _load_live(opa_url: str, rego_source: str) -> None:
    resp = httpx.put(
        f"{opa_url}/v1/policies/live",
        content=rego_source.encode("utf-8"),
        headers={"Content-Type": "text/plain"},
        timeout=5,
    )
    resp.raise_for_status()


def _query_live(opa_url: str, input_doc: dict) -> dict:
    resp = httpx.post(f"{opa_url}{DATA_PATH}", json={"input": input_doc}, timeout=5)
    resp.raise_for_status()
    return resp.json().get("result", {})


def test_compiled_bundle_allows_a_matching_intent(opa_url):
    bundle = build_bundle([_policy()], "bundle-1", 1)
    _load_live(opa_url, bundle.rego_source)

    result = _query_live(
        opa_url,
        {
            "intent": {"action": "vendor_payment", "amount": 50000, "currency": "ZAR", "vendor": {"approved": True}},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert result["allow"] is True
    assert result["deny"] is False
    assert result["evaluated_mandates"] == ["rp-1"]


def test_over_limit_amount_falls_through_to_deny_fallback(opa_url):
    bundle = build_bundle([_policy()], "bundle-1", 1)
    _load_live(opa_url, bundle.rego_source)

    result = _query_live(
        opa_url,
        {
            "intent": {"action": "vendor_payment", "amount": 999999, "currency": "ZAR", "vendor": {"approved": True}},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert result["allow"] is False
    assert result["deny"] is True
    assert result["deny_reason"] == "no_policy_covers_scope"
    assert result.get("evaluated_mandates", []) == []


def test_missing_nested_field_fails_condition_safely_not_an_error(opa_url):
    """input.intent.vendor.approved when "vendor" is entirely absent must
    make the condition undefined (=> policy doesn't match => falls to the
    deny fallback), never a runtime error from OPA."""
    bundle = build_bundle([_policy()], "bundle-1", 1)
    _load_live(opa_url, bundle.rego_source)

    result = _query_live(
        opa_url,
        {
            "intent": {"action": "vendor_payment", "amount": 50000, "currency": "ZAR"},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert result["allow"] is False
    assert result["deny"] is True


def test_explicit_deny_effect_policy_is_evaluated(opa_url):
    deny_policy = _policy(
        id="rp-2",
        scope=Scope(principal="prin_1", action="wire_transfer"),
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.GT, value=500000),)),
        effect=Effect.DENY,
    )
    bundle = build_bundle([deny_policy], "bundle-2", 1)
    _load_live(opa_url, bundle.rego_source)

    result = _query_live(
        opa_url,
        {
            "intent": {"action": "wire_transfer", "amount": 600000},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert result["deny"] is True
    assert result["evaluated_mandates"] == ["rp-2"]


def test_require_human_review_effect_is_evaluated(opa_url):
    review_policy = _policy(
        id="rp-3",
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.GTE, value=250000),)),
        effect=Effect.REQUIRE_HUMAN_REVIEW,
    )
    bundle = build_bundle([review_policy], "bundle-3", 1)
    _load_live(opa_url, bundle.rego_source)

    result = _query_live(
        opa_url,
        {
            "intent": {"action": "vendor_payment", "amount": 300000},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert result["requires_review"] is True
    assert result["review_reason"] == "policy_matched:rp-3"


def test_unmodified_decision_engine_consumes_compiler_v2_output(opa_url):
    """The actual proof of this phase's central claim: domain/decision/
    engine.py's real evaluate(), imported and called completely
    unmodified, correctly interprets a Compiler V2 bundle it has no idea
    didn't come from domain/compiler/compiler.py."""
    bundle = build_bundle([_policy()], "bundle-1", 1)
    _load_live(opa_url, bundle.rego_source)

    class _FixedPolicyStore:
        def get_active(self):
            return decision_engine.ActivePolicy(id=bundle.bundle_id, version=bundle.version)

    class _RealHttpOpaClient:
        def query(self, input_doc, timeout_ms):
            resp = httpx.post(
                f"{opa_url}{DATA_PATH}", json={"input": input_doc}, timeout=timeout_ms / 1000
            )
            resp.raise_for_status()
            return resp.json().get("result", {})

    allowed = decision_engine.evaluate(
        intent={"action": "vendor_payment", "amount": 50000, "currency": "ZAR", "vendor": {"approved": True}},
        context={},
        acting_for_principal_id="prin_1",
        policy_store=_FixedPolicyStore(),
        opa_client=_RealHttpOpaClient(),
    )
    assert allowed.outcome == "ALLOW"
    assert allowed.evaluated_mandates == ["rp-1"]

    denied = decision_engine.evaluate(
        intent={"action": "vendor_payment", "amount": 999999, "currency": "ZAR", "vendor": {"approved": True}},
        context={},
        acting_for_principal_id="prin_1",
        policy_store=_FixedPolicyStore(),
        opa_client=_RealHttpOpaClient(),
    )
    assert denied.outcome == "DENY"


def test_dry_run_never_affects_the_live_bundle(opa_url):
    live_policy = _policy(id="rp-live", scope=Scope(principal="prin_1", action="vendor_payment"))
    live_bundle = build_bundle([live_policy], "bundle-live", 1)
    _load_live(opa_url, live_bundle.rego_source)

    draft_policy = _policy(
        id="rp-draft",
        scope=Scope(principal="prin_1", action="wire_transfer"),
        conditions=ConditionSet(all=(Condition(field="amount", operator=Operator.LTE, value=1),)),
    )
    draft_bundle = build_bundle([draft_policy], "bundle-draft", 1)

    draft_result = dry_run(
        draft_bundle,
        {
            "intent": {"action": "wire_transfer", "amount": 1},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
        opa_url=opa_url,
    )
    assert draft_result.allow is True

    # The live bundle must be completely unaffected by the dry-run that
    # just happened: same query, same result, as if the dry-run never
    # occurred at all.
    live_result = _query_live(
        opa_url,
        {
            "intent": {"action": "vendor_payment", "amount": 50000, "currency": "ZAR", "vendor": {"approved": True}},
            "agent": {"acting_for_principal_id": "prin_1"},
        },
    )
    assert live_result["allow"] is True
    assert live_result["evaluated_mandates"] == ["rp-live"]

    # And the throwaway dry-run package must actually be gone afterward.
    all_policies = httpx.get(f"{opa_url}/v1/policies", timeout=5).json().get("result", [])
    dryrun_ids = [p["id"] for p in all_policies if p["id"].startswith("dryrun-")]
    assert dryrun_ids == []
