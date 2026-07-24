import pytest

from app.domain.decision.engine import (
    ActivePolicy,
    NoActivePolicyError,
    OPAEvaluationError,
    OPATimeoutError,
    evaluate,
)


class FakePolicyStore:
    def __init__(self, active: ActivePolicy | None):
        self._active = active

    def get_active(self) -> ActivePolicy:
        if self._active is None:
            raise NoActivePolicyError()
        return self._active


class FakeOpaClient:
    def __init__(self, result=None, raises=None):
        self._result = result
        self._raises = raises

    def query(self, input_doc, timeout_ms):
        if self._raises:
            raise self._raises
        return self._result


ACTIVE = ActivePolicy(id="pol_1", version=3)
INTENT = {"action": "vendor_payment", "amount": 42000}
CONTEXT = {"environment": "production"}


def test_no_active_policy_resolves_to_human_review():
    decision = evaluate(
        INTENT, CONTEXT, "prin_1", FakePolicyStore(None), FakeOpaClient()
    )
    assert decision.outcome == "HUMAN_REVIEW"
    assert decision.reason == "no_active_policy"


def test_opa_timeout_resolves_to_human_review():
    client = FakeOpaClient(raises=OPATimeoutError())
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "HUMAN_REVIEW"
    assert decision.reason == "opa_timeout"
    assert decision.policy_id == "pol_1"


def test_opa_evaluation_error_resolves_to_human_review_with_code():
    client = FakeOpaClient(raises=OPAEvaluationError(code="connection_error"))
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "HUMAN_REVIEW"
    assert decision.reason == "opa_error:connection_error"


def test_requires_review_true_resolves_to_human_review():
    client = FakeOpaClient(
        result={
            "requires_review": True,
            "review_reason": "dual_control_band",
            "evaluated_mandates": ["mand_1"],
        }
    )
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "HUMAN_REVIEW"
    assert decision.reason == "dual_control_band"
    assert decision.evaluated_mandates == ["mand_1"]


def test_allow_true_and_deny_not_true_resolves_to_allow():
    client = FakeOpaClient(result={"allow": True, "deny": False, "evaluated_mandates": ["mand_1"]})
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "ALLOW"
    assert decision.evaluated_mandates == ["mand_1"]


def test_deny_true_resolves_to_deny():
    client = FakeOpaClient(result={"deny": True, "deny_reason": "over_limit"})
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "DENY"
    assert decision.reason == "over_limit"


def test_allow_and_deny_both_true_resolves_to_deny_not_allow():
    """Precedence check: a contradictory bundle (a regression Static Policy
    Validation, spec 12.4 Stage 7, is meant to catch before activation) must
    never resolve to ALLOW just because allow happens to be true."""
    client = FakeOpaClient(result={"allow": True, "deny": True, "deny_reason": "conflict"})
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "DENY"


def test_ambiguous_result_resolves_to_human_review():
    """Neither allow nor deny nor requires_review set; fail closed."""
    client = FakeOpaClient(result={})
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "HUMAN_REVIEW"
    assert decision.reason == "undetermined"


@pytest.mark.parametrize("bad_result", [{"allow": False}, {"deny": False}, {"allow": None}])
def test_various_non_committal_results_resolve_to_human_review(bad_result):
    client = FakeOpaClient(result=bad_result)
    decision = evaluate(INTENT, CONTEXT, "prin_1", FakePolicyStore(ACTIVE), client)
    assert decision.outcome == "HUMAN_REVIEW"
