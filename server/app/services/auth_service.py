"""User authentication: password hashing, sessions, and API keys.

This is additive to, not a replacement for, `security.verify_operator_key`
-- the single shared operator key keeps working unchanged for every
existing integration. This module resolves a *role* (see
`app.domain.rbac.permissions`) from a session bearer token or an API key,
for `require_permission` to check against.
"""

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.db.models import ApiKey, Organization, User, UserSession
from app.domain.rbac.permissions import Role

logger = logging.getLogger("payreality.auth")

_DEFAULT_SESSION_TIMEOUT_MINUTES = 480
_API_KEY_PREFIX = "pr_live_"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # A malformed stored hash is a data problem, not a valid password
        # attempt -- treat it as a failed login, never raise into the
        # caller and turn a bad row into a 500.
        return False


def authenticate(db: DbSession, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or user.status != "active":
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _session_timeout_minutes(organization: Organization | None) -> int:
    if organization is None:
        return _DEFAULT_SESSION_TIMEOUT_MINUTES
    return organization.settings.get("session_timeout_minutes", _DEFAULT_SESSION_TIMEOUT_MINUTES)


def create_session(db: DbSession, user: User, organization: Organization | None) -> UserSession:
    """Fixed expiry set at login, not a sliding window refreshed on every
    request -- a deliberate scope reduction for Phase 10: simpler to
    reason about and to revoke (delete the row), at the cost of a user
    being logged out mid-session once the timeout elapses rather than
    for as long as they stay active."""
    now = datetime.now(timezone.utc)
    timeout = _session_timeout_minutes(organization)
    session = UserSession(user_id=user.id, expires_at=now + timedelta(minutes=timeout))
    db.add(session)
    user.last_login_at = now
    db.commit()
    db.refresh(session)
    return session


def revoke_session(db: DbSession, session_id) -> None:
    session = db.get(UserSession, session_id)
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()


def revoke_session_for_token(db: DbSession, token: str) -> None:
    try:
        session_id = uuid.UUID(token)
    except ValueError:
        return
    revoke_session(db, session_id)


def resolve_user_for_session_token(db: DbSession, token: str) -> User | None:
    """Session tokens only -- an API key has no single acting User, only
    an Organisation and a Role, so it deliberately returns None rather
    than inventing a user."""
    try:
        session_id = uuid.UUID(token)
    except ValueError:
        return None
    session = db.get(UserSession, session_id)
    if session is None:
        return None
    now = datetime.now(timezone.utc)
    if session.revoked_at is not None or session.expires_at <= now:
        return None
    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        return None
    return user


def resolve_organization_id_for_token(db: DbSession, token: str):
    """Used by routes that need to scope a query to "this caller's
    organisation" (e.g. listing Users), covering both a session token
    (via the User it resolves to) and an API key (via the key's own
    organization_id, since an API key isn't tied to one User)."""
    user = resolve_user_for_session_token(db, token)
    if user is not None:
        return user.organization_id
    api_key = db.scalar(select(ApiKey).where(ApiKey.key_hash == hash_api_key(token)))
    if api_key is not None and api_key.revoked_at is None:
        return api_key.organization_id
    return None


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key() -> tuple[str, str, str]:
    """Returns (raw_key, key_hash, key_prefix). The raw key is shown to the
    operator exactly once at creation time and never stored -- only its
    SHA-256 hash and a short display prefix are persisted."""
    raw_key = _API_KEY_PREFIX + secrets.token_urlsafe(32)
    return raw_key, hash_api_key(raw_key), raw_key[: len(_API_KEY_PREFIX) + 8]


def _resolve_role_for_api_key(db: DbSession, token: str) -> Role | None:
    api_key = db.scalar(select(ApiKey).where(ApiKey.key_hash == hash_api_key(token)))
    if api_key is None or api_key.revoked_at is not None:
        return None
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()
    try:
        return Role(api_key.role)
    except ValueError:
        logger.error("api_key_invalid_role api_key_id=%s role=%s", api_key.id, api_key.role)
        return None


def resolve_role_for_token(db: DbSession, token: str) -> Role | None:
    """Session tokens are the session's own UUID; API keys are the
    `pr_live_...` secret generated by `generate_api_key`. Trying the
    session lookup first is safe and cheap: an API key never parses as a
    UUID, so it falls straight through to the API-key lookup."""
    user = resolve_user_for_session_token(db, token)
    if user is not None:
        try:
            return Role(user.role)
        except ValueError:
            logger.error("user_invalid_role user_id=%s role=%s", user.id, user.role)
            return None
    return _resolve_role_for_api_key(db, token)
