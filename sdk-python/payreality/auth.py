"""Everything a developer would otherwise have to do by hand for every
authorize() call: generate a timestamp, generate a nonce, sign the
exact request body, and attach the two auth headers the server expects
(server/app/dependencies.py::verify_agent_signature). Nothing here is
part of the public API; `Agent.authorize()` is the only caller.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from . import crypto

KEY_ID_HEADER = "X-PayReality-Key-Id"
SIGNATURE_HEADER = "X-PayReality-Signature"


def new_nonce() -> str:
    """A fresh, unique value per request; the server enforces
    UNIQUE(agent_id, nonce) to reject replayed requests."""
    return uuid.uuid4().hex


def utc_now_iso() -> str:
    """ISO 8601 in UTC, the format `datetime` fields in the server's
    Pydantic schemas expect."""
    return datetime.now(timezone.utc).isoformat()


def signed_headers(body: bytes, certificate_id: str, private_key_b64: str) -> dict[str, str]:
    """Signs `body` (the exact bytes about to be sent) and returns the
    two headers that authenticate an authorize() call. certificate_id
    identifies which registered certificate to verify against; the
    signature proves this request was made by whoever holds that
    certificate's private key."""
    return {
        KEY_ID_HEADER: certificate_id,
        SIGNATURE_HEADER: crypto.sign(body, private_key_b64),
    }
