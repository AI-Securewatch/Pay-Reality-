from app.services.authority_context_service import classify_risk


def test_classify_risk_thresholds():
    assert classify_risk(0) == "LOW"
    assert classify_risk(49_999) == "LOW"
    assert classify_risk(50_000) == "MEDIUM"
    assert classify_risk(99_999) == "MEDIUM"
    assert classify_risk(100_000) == "HIGH"
    assert classify_risk(249_999) == "HIGH"
    assert classify_risk(250_000) == "CRITICAL"


def test_classify_risk_none_amount_is_low():
    """Not every Intent's action has an amount concept; absent amount
    must never raise, and defaults to the lowest band rather than
    silently escalating risk for something that isn't even measured in
    dollars."""
    assert classify_risk(None) == "LOW"
