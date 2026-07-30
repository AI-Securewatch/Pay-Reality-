import base64

import nacl.signing

from app.domain.evidence.signing import (
    canonicalize,
    payload_hash,
    public_key_b64_from_signing_key_b64,
    sign_payload,
    verify_payload,
)


def _gen_key_b64() -> str:
    return base64.b64encode(bytes(nacl.signing.SigningKey.generate())).decode("ascii")


def test_canonicalize_is_key_order_independent():
    a = {"b": 1, "a": 2, "c": {"y": 1, "x": 2}}
    b = {"a": 2, "c": {"x": 2, "y": 1}, "b": 1}
    assert canonicalize(a) == canonicalize(b)


def test_canonicalize_has_no_incidental_whitespace():
    out = canonicalize({"a": 1})
    assert out == b'{"a":1}'


def test_sign_then_verify_round_trips():
    key = _gen_key_b64()
    pub = public_key_b64_from_signing_key_b64(key)
    payload = {"decision_id": "dec_1", "outcome": "ALLOW"}

    sig = sign_payload(payload, key, key_id="test_key")

    assert sig.algorithm == "ed25519"
    assert verify_payload(payload, sig, pub) is True


def test_verify_fails_on_tampered_payload():
    key = _gen_key_b64()
    pub = public_key_b64_from_signing_key_b64(key)
    payload = {"decision_id": "dec_1", "outcome": "ALLOW"}
    sig = sign_payload(payload, key, key_id="test_key")

    tampered = {"decision_id": "dec_1", "outcome": "DENY"}
    assert verify_payload(tampered, sig, pub) is False


def test_verify_fails_with_wrong_public_key():
    key = _gen_key_b64()
    other_pub = public_key_b64_from_signing_key_b64(_gen_key_b64())
    payload = {"decision_id": "dec_1", "outcome": "ALLOW"}
    sig = sign_payload(payload, key, key_id="test_key")

    assert verify_payload(payload, sig, other_pub) is False


def test_verify_never_raises_on_garbage_signature():
    key = _gen_key_b64()
    pub = public_key_b64_from_signing_key_b64(key)
    payload = {"decision_id": "dec_1"}
    sig = sign_payload(payload, key, key_id="test_key")
    bad_sig = type(sig)(algorithm=sig.algorithm, key_id=sig.key_id, value="not-base64!!")

    assert verify_payload(payload, bad_sig, pub) is False


def test_payload_hash_is_key_order_independent():
    """Same underlying discipline as canonicalize itself (Phase 5,
    PHASE_5_EVIDENCE.md's chaining): the hash a later record's
    previous_hash must match can't depend on incidental key ordering."""
    a = {"b": 1, "a": 2}
    b = {"a": 2, "b": 1}
    assert payload_hash(a) == payload_hash(b)


def test_payload_hash_changes_when_payload_changes():
    a = {"decision_id": "dec_1", "outcome": "ALLOW"}
    b = {"decision_id": "dec_1", "outcome": "DENY"}
    assert payload_hash(a) != payload_hash(b)


def test_payload_hash_is_deterministic_hex_sha256():
    import hashlib

    payload = {"a": 1}
    assert payload_hash(payload) == hashlib.sha256(canonicalize(payload)).hexdigest()
