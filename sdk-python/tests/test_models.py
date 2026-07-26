import pytest

from payreality.exceptions import AuthorizationDenied, HumanReviewRequired
from payreality.models import Decision


def _decision(outcome, status="RESOLVED"):
    return Decision(
        outcome=outcome,
        decision_id="d-1",
        evidence_id="e-1",
        reason="because",
        explanation="because",
        status=status,
    )


def test_allow_properties():
    d = _decision("ALLOW")
    assert d.allowed is True
    assert d.denied is False
    assert d.requires_human_review is False
    d.raise_for_outcome()  # never raises on ALLOW


def test_deny_properties_and_raise():
    d = _decision("DENY")
    assert d.allowed is False
    assert d.denied is True
    with pytest.raises(AuthorizationDenied) as exc_info:
        d.raise_for_outcome()
    assert exc_info.value.decision is d


def test_human_review_properties_and_raise():
    d = _decision("HUMAN_REVIEW", status="PENDING")
    assert d.requires_human_review is True
    assert d.pending is True
    with pytest.raises(HumanReviewRequired) as exc_info:
        d.raise_for_outcome()
    assert exc_info.value.decision is d


def test_pending_false_once_resolved():
    d = _decision("HUMAN_REVIEW", status="RESOLVED")
    assert d.pending is False
