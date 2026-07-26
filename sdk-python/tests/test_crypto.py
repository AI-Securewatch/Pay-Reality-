import base64

import nacl.exceptions
import nacl.signing
import pytest

from payreality import crypto


def test_generate_keypair_produces_valid_ed25519_keys():
    pair = crypto.generate_keypair()
    private_bytes = base64.b64decode(pair.private_key_b64)
    public_bytes = base64.b64decode(pair.public_key_b64)
    assert len(private_bytes) == 32
    assert len(public_bytes) == 32


def test_public_key_from_private_matches_generated_pair():
    pair = crypto.generate_keypair()
    assert crypto.public_key_from_private(pair.private_key_b64) == pair.public_key_b64


def test_two_generated_keypairs_are_different():
    a = crypto.generate_keypair()
    b = crypto.generate_keypair()
    assert a.private_key_b64 != b.private_key_b64
    assert a.public_key_b64 != b.public_key_b64


def test_encode_public_key_for_wire_matches_server_expected_format():
    # server/app/domain/auth/signature.py::_decode_public_key splits on
    # ":" and base64-decodes the last segment.
    encoded = crypto.encode_public_key_for_wire("abc123==")
    assert encoded == "ed25519:base64:abc123=="
    assert base64.b64decode(encoded.split(":")[-1]) == base64.b64decode("abc123==")


def test_sign_produces_a_signature_verifiable_by_the_exact_library_the_server_uses():
    """This is the single most important test in the suite: it proves
    byte-for-byte compatibility with server/app/domain/auth/signature.py's
    verification, not just that signing "works" in isolation."""
    pair = crypto.generate_keypair()
    body = b'{"action":"vendor_payment","amount":85000}'
    signature_b64 = crypto.sign(body, pair.private_key_b64)

    verify_key = nacl.signing.VerifyKey(base64.b64decode(pair.public_key_b64))
    verify_key.verify(body, base64.b64decode(signature_b64))  # raises if invalid


def test_sign_over_different_bodies_produces_different_signatures():
    pair = crypto.generate_keypair()
    sig_a = crypto.sign(b"body-a", pair.private_key_b64)
    sig_b = crypto.sign(b"body-b", pair.private_key_b64)
    assert sig_a != sig_b


def test_a_tampered_body_fails_verification():
    pair = crypto.generate_keypair()
    signature_b64 = crypto.sign(b"original body", pair.private_key_b64)
    verify_key = nacl.signing.VerifyKey(base64.b64decode(pair.public_key_b64))
    with pytest.raises(nacl.exceptions.BadSignatureError):
        verify_key.verify(b"tampered body", base64.b64decode(signature_b64))
