import requests

from payreality.retry import RetryPolicy, is_retryable_exception, is_retryable_status


def test_retryable_status_codes():
    for code in (500, 502, 503, 504):
        assert is_retryable_status(code) is True
    for code in (400, 401, 403, 404, 422, 200):
        assert is_retryable_status(code) is False


def test_retryable_exceptions():
    assert is_retryable_exception(requests.exceptions.ConnectionError()) is True
    assert is_retryable_exception(requests.exceptions.Timeout()) is True
    assert is_retryable_exception(ValueError()) is False
    assert is_retryable_exception(requests.exceptions.HTTPError()) is False


def test_delay_for_attempt_grows_exponentially_then_caps():
    policy = RetryPolicy(backoff_base_seconds=1.0, backoff_max_seconds=8.0)
    assert policy.delay_for_attempt(0) == 1.0
    assert policy.delay_for_attempt(1) == 2.0
    assert policy.delay_for_attempt(2) == 4.0
    assert policy.delay_for_attempt(3) == 8.0
    assert policy.delay_for_attempt(10) == 8.0  # capped, never grows unbounded
