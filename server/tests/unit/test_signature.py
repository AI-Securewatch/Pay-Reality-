import base64
from datetime import datetime, timedelta, timezone

import nacl.signing

from app.domain.auth.signature import check_timestamp_window, verify_request_signature

FIXED_NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def _gen_keypair():
    sk = nacl.signing.SigningKey.generate()
    pub_b64 = base64.b64encode(bytes(sk.verify_key)).decode("ascii")
    return sk, pub_b64


def test_valid_signature_verifies():
    sk, pub = _gen_keypair()
    body = b'{"agent_id":"agt_1","action":"vendor_payment"}'
    sig = base64.b64encode(sk.sign(body).signature).decode("ascii")
    assert verify_request_signature(body, sig, pub) is True


def test_valid_signature_verifies_with_prefixed_public_key_format():
    sk, pub = _gen_keypair()
    body = b"hello"
    sig = base64.b64encode(sk.sign(body).signature).decode("ascii")
    assert verify_request_signature(body, sig, f"ed25519:base64:{pub}") is True


def test_tampered_body_fails_verification():
    sk, pub = _gen_keypair()
    body = b'{"amount":100}'
    sig = base64.b64encode(sk.sign(body).signature).decode("ascii")
    assert verify_request_signature(b'{"amount":999}', sig, pub) is False


def test_wrong_key_fails_verification():
    sk, _ = _gen_keypair()
    _, other_pub = _gen_keypair()
    body = b"hello"
    sig = base64.b64encode(sk.sign(body).signature).decode("ascii")
    assert verify_request_signature(body, sig, other_pub) is False


def test_garbage_signature_never_raises():
    _, pub = _gen_keypair()
    assert verify_request_signature(b"hello", "not-valid-base64!!", pub) is False


def test_timestamp_within_window_ok():
    ts = FIXED_NOW - timedelta(seconds=30)
    result = check_timestamp_window(ts, window_seconds=300, now=FIXED_NOW)
    assert result.ok is True


def test_timestamp_outside_window_rejected():
    ts = FIXED_NOW - timedelta(seconds=301)
    result = check_timestamp_window(ts, window_seconds=300, now=FIXED_NOW)
    assert result.ok is False
    assert result.reason == "requested_at_outside_window"


def test_future_timestamp_outside_window_also_rejected():
    ts = FIXED_NOW + timedelta(seconds=301)
    result = check_timestamp_window(ts, window_seconds=300, now=FIXED_NOW)
    assert result.ok is False


def test_naive_datetime_rejected():
    ts = datetime(2026, 1, 1, 12, 0, 0)  # no tzinfo
    result = check_timestamp_window(ts, window_seconds=300, now=FIXED_NOW)
    assert result.ok is False
    assert result.reason == "requested_at_missing_timezone"
