from datetime import datetime

import nacl.signing
import base64

from payreality import crypto
from payreality.auth import KEY_ID_HEADER, SIGNATURE_HEADER, new_nonce, signed_headers, utc_now_iso


def test_new_nonce_is_unique_each_call():
    assert new_nonce() != new_nonce()


def test_utc_now_iso_parses_as_a_valid_iso8601_datetime_with_timezone():
    parsed = datetime.fromisoformat(utc_now_iso())
    assert parsed.tzinfo is not None


def test_signed_headers_has_the_two_headers_the_server_requires():
    pair = crypto.generate_keypair()
    headers = signed_headers(b"body", "cert-123", pair.private_key_b64)
    assert set(headers) == {KEY_ID_HEADER, SIGNATURE_HEADER}
    assert headers[KEY_ID_HEADER] == "cert-123"


def test_signed_headers_signature_verifies_against_the_public_key():
    pair = crypto.generate_keypair()
    body = b'{"hello":"world"}'
    headers = signed_headers(body, "cert-123", pair.private_key_b64)

    verify_key = nacl.signing.VerifyKey(base64.b64decode(pair.public_key_b64))
    verify_key.verify(body, base64.b64decode(headers[SIGNATURE_HEADER]))
