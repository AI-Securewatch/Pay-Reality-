"""Retry policy: network failures, timeouts, and 5xx responses are
retried with exponential backoff; 401/403, validation failures (422),
and any other 4xx are never retried, since retrying an unauthenticated
or malformed request cannot succeed by trying again.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import requests

# Server errors are assumed transient and worth retrying; 4xx errors are
# assumed the caller's fault (bad credentials, bad request shape, a
# real policy denial) and are never retried.
RETRYABLE_STATUS_CODES = frozenset({500, 502, 503, 504})


@dataclass(frozen=True)
class RetryPolicy:
    max_retries: int = 3
    backoff_base_seconds: float = 0.5
    backoff_max_seconds: float = 8.0

    def delay_for_attempt(self, attempt: int) -> float:
        """attempt is 0-indexed (0 = first retry). Exponential backoff,
        capped so a high retry count doesn't produce absurd waits."""
        return min(self.backoff_base_seconds * (2**attempt), self.backoff_max_seconds)


def is_retryable_status(status_code: int) -> bool:
    return status_code in RETRYABLE_STATUS_CODES


def is_retryable_exception(exc: Exception) -> bool:
    return isinstance(exc, (requests.exceptions.ConnectionError, requests.exceptions.Timeout))


def sleep_before_retry(policy: RetryPolicy, attempt: int) -> None:
    time.sleep(policy.delay_for_attempt(attempt))
