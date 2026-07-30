"""Canonical JSON serialization + ED25519 signing for Evidence records.

Implements spec Section 17.2 (signing process) and 17.5 (verification).
Pure module: no DB, no network. The signing key is passed in explicitly
rather than read from settings here, so this stays trivially unit-testable.
"""

import base64
import hashlib
import json
from dataclasses import dataclass
from typing import Any

import nacl.exceptions
import nacl.signing


def canonicalize(payload: dict[str, Any]) -> bytes:
    """Deterministic JSON serialization: sorted keys, no incidental whitespace.

    Matches spec 17.2 step 1. Same logical payload always produces the same
    byte sequence, which is what makes signing and verification reproducible.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def payload_hash(payload: dict[str, Any]) -> str:
    """SHA-256 of the canonical JSON, hex-encoded. Used for Evidence
    chaining (PHASE_5_EVIDENCE.md): each new record's previous_hash
    references this exact value computed over its predecessor's payload,
    so verifying the chain means confirming that link, not just that
    each record's own signature is independently valid -- a deleted
    record breaks this at the gap it left, even though every remaining
    record's own signature still checks out."""
    return hashlib.sha256(canonicalize(payload)).hexdigest()


@dataclass(frozen=True)
class Signature:
    algorithm: str
    key_id: str
    value: str  # base64


def sign_payload(payload: dict[str, Any], signing_key_b64: str, key_id: str) -> Signature:
    """spec 17.2 steps 2-3: sign SHA-256(canonical_json_bytes) with ED25519."""
    signing_key = nacl.signing.SigningKey(base64.b64decode(signing_key_b64))
    digest = hashlib.sha256(canonicalize(payload)).digest()
    signed = signing_key.sign(digest)
    return Signature(
        algorithm="ed25519",
        key_id=key_id,
        value=base64.b64encode(signed.signature).decode("ascii"),
    )


def verify_payload(payload: dict[str, Any], signature: Signature, public_key_b64: str) -> bool:
    """spec 17.5: re-serialize, recompute digest, verify against the public key.

    Returns False (never raises) on any failure: a bad signature is data,
    not an exceptional program state, and callers must treat False as a P1
    signal per spec 17.5, not as an error to swallow.
    """
    try:
        verify_key = nacl.signing.VerifyKey(base64.b64decode(public_key_b64))
        digest = hashlib.sha256(canonicalize(payload)).digest()
        verify_key.verify(digest, base64.b64decode(signature.value))
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, TypeError):
        return False


def public_key_b64_from_signing_key_b64(signing_key_b64: str) -> str:
    """Derive the public key for a given private signing key, used at
    startup to know what public key verification should check against."""
    signing_key = nacl.signing.SigningKey(base64.b64decode(signing_key_b64))
    return base64.b64encode(bytes(signing_key.verify_key)).decode("ascii")
