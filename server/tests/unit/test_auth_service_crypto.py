"""Password hashing and API-key generation/hashing: the pure functions in
auth_service.py that don't touch a database, tested the same way this
codebase already tests signing.py's pure crypto helpers (test_signing.py).
Everything that resolves a session/API key against the database is
integration-level and isn't covered here, matching this codebase's
established pattern of skipping DB-dependent tests where no local
Postgres is available."""

from app.services.auth_service import (
    _API_KEY_PREFIX,
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_password,
)


def test_hash_password_round_trips():
    password_hash = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", password_hash) is True


def test_wrong_password_fails():
    password_hash = hash_password("correct horse battery staple")
    assert verify_password("wrong password", password_hash) is False


def test_hash_password_is_salted_and_never_stores_plaintext():
    password_hash = hash_password("same password")
    assert "same password" not in password_hash
    assert hash_password("same password") != password_hash


def test_malformed_stored_hash_fails_closed_not_raises():
    assert verify_password("anything", "not-a-real-bcrypt-hash") is False


def test_generate_api_key_has_stable_prefix_and_hashes_consistently():
    raw_key, key_hash, key_prefix = generate_api_key()
    assert raw_key.startswith(_API_KEY_PREFIX)
    assert key_prefix == raw_key[: len(_API_KEY_PREFIX) + 8]
    assert hash_api_key(raw_key) == key_hash


def test_generate_api_key_is_unique_per_call():
    raw_key_1, _, _ = generate_api_key()
    raw_key_2, _, _ = generate_api_key()
    assert raw_key_1 != raw_key_2


def test_hash_api_key_is_deterministic():
    assert hash_api_key("pr_live_abc") == hash_api_key("pr_live_abc")
    assert hash_api_key("pr_live_abc") != hash_api_key("pr_live_xyz")
