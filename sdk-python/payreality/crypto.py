"""ED25519 key generation and signing. Uses PyNaCl deliberately, not any
other Python ED25519 implementation: the PayReality server verifies
signatures with `nacl.signing.VerifyKey` (server/app/domain/auth/signature.py),
and using the same library family on both sides eliminates any risk of a
subtle cross-implementation incompatibility in how ED25519 is applied.

Nothing in this module ever touches the network. It is the one place in
the SDK that ever sees a raw private key.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass

import nacl.encoding
import nacl.signing


@dataclass(frozen=True)
class KeyPair:
    private_key_b64: str
    public_key_b64: str


def generate_keypair() -> KeyPair:
    """A fresh ED25519 keypair, base64-encoded. Called once per agent,
    normally from `Agent.register()`."""
    signing_key = nacl.signing.SigningKey.generate()
    private_bytes = bytes(signing_key)
    public_bytes = bytes(signing_key.verify_key)
    return KeyPair(
        private_key_b64=base64.b64encode(private_bytes).decode("ascii"),
        public_key_b64=base64.b64encode(public_bytes).decode("ascii"),
    )


def public_key_from_private(private_key_b64: str) -> str:
    """ED25519 public keys are deterministically derived from the
    private key; this lets the SDK recognize "have I registered this
    exact key before?" from the private key alone, without a network
    call."""
    signing_key = nacl.signing.SigningKey(base64.b64decode(private_key_b64))
    return base64.b64encode(bytes(signing_key.verify_key)).decode("ascii")


def encode_public_key_for_wire(public_key_b64: str) -> str:
    """The server accepts 'ed25519:base64:<...>' or plain base64
    (server/app/domain/auth/signature.py::_decode_public_key); always
    send the explicit, self-describing form."""
    return f"ed25519:base64:{public_key_b64}"


def sign(body: bytes, private_key_b64: str) -> str:
    """Signs the exact bytes that will be sent as the request body, and
    returns the signature, base64-encoded, ready for the
    X-PayReality-Signature header. The server verifies over the raw
    body bytes it received, so the caller must sign the same bytes it
    actually transmits, not a re-serialization of the same data."""
    signing_key = nacl.signing.SigningKey(base64.b64decode(private_key_b64))
    signed = signing_key.sign(body)
    return base64.b64encode(signed.signature).decode("ascii")
