"""Agent request-signature verification: spec Section 21.2 (compromised
agent credential mitigation) and Section 19 (X-PayReality-Key-Id /
X-PayReality-Signature headers).

Pure module: takes raw bytes and keys, no DB/HTTP dependency, so it's
unit-testable the same way as evidence signing.
"""

import base64
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import nacl.exceptions
import nacl.signing


def _decode_public_key(public_key: str) -> bytes:
    """Certificates store keys as 'ed25519:base64:<...>' (spec 19.4's
    example) or plain base64; accept either."""
    raw = public_key.split(":")[-1]
    return base64.b64decode(raw)


def verify_request_signature(body: bytes, signature_b64: str, public_key: str) -> bool:
    """Verify a signature over the raw canonical request body. Never
    raises: an invalid signature is data (reject the request), not an
    exceptional program state."""
    try:
        verify_key = nacl.signing.VerifyKey(_decode_public_key(public_key))
        verify_key.verify(body, base64.b64decode(signature_b64))
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
        return False


@dataclass(frozen=True)
class ReplayCheckResult:
    ok: bool
    reason: str | None = None


def check_timestamp_window(
    requested_at: datetime, window_seconds: int, now: datetime | None = None
) -> ReplayCheckResult:
    """spec 21.2: requests outside the signature validity window are
    rejected regardless of nonce. Nonce-reuse itself is enforced by the
    intents table's UNIQUE(agent_id, nonce) constraint at insert time
    (see app.services.intent_service) rather than a separate cache;
    Phase 1 has no Redis dependency, and the DB constraint gives a
    stronger guarantee (no reuse ever, not just within a TTL window)."""
    now = now or datetime.now(timezone.utc)
    if requested_at.tzinfo is None:
        return ReplayCheckResult(ok=False, reason="requested_at_missing_timezone")
    delta = abs((now - requested_at).total_seconds())
    if delta > window_seconds:
        return ReplayCheckResult(ok=False, reason="requested_at_outside_window")
    return ReplayCheckResult(ok=True)
