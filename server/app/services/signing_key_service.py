"""The signing-key registry: what makes evidence-key rotation safe.

Before this module existed, `evidence_service.verify_evidence` and
`agent_service.verify_audit_event` both checked a stored signature
against whatever `settings.evidence_signing_key_b64` happens to be
configured *right now*. That meant rotating the key -- for any reason,
including routine security hygiene -- would have silently made every
Evidence record and every Agent Lifecycle audit event ever signed under
the previous key unverifiable, permanently. See EVIDENCE_KEY_ROTATION.md
for the full rotation flow this module enables.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.models import SigningKey

logger = logging.getLogger("payreality.signing_keys")


def ensure_current_key_registered(db: Session, key_id: str, public_key_b64: str) -> None:
    """Called once at app startup (main.py's lifespan), not per-request:
    this is a registry maintenance step, not something that needs to run
    on every Evidence/audit event signed.

    Idempotent across every restart: if `key_id` is already registered,
    this does nothing. If it's genuinely new -- the app just started
    with a rotated EVIDENCE_SIGNING_KEY_B64/_ID -- retires whichever key
    was previously active and registers this one as the new active key.
    That's the entire rotation mechanism: an operator generates a new
    keypair, sets the two env vars, and redeploys; this function does
    the rest the moment the new process boots.
    """
    existing = db.get(SigningKey, key_id)
    if existing is not None:
        if existing.public_key_b64 != public_key_b64:
            # A key_id whose registered public key doesn't match what's
            # configured now is a serious anomaly (key_id reuse with
            # different material, or registry tampering) -- never
            # silently overwrite a historical row to "fix" this.
            logger.error(
                "signing_key_mismatch key_id=%s: registered public key does not match "
                "the currently configured key. Refusing to overwrite the registry row. "
                "This needs manual investigation, not an automatic fix.",
                key_id,
            )
        return

    db.execute(update(SigningKey).where(SigningKey.retired_at.is_(None)).values(retired_at=datetime.now(timezone.utc)))
    db.add(SigningKey(key_id=key_id, public_key_b64=public_key_b64))
    db.commit()
    logger.info("signing_key_registered key_id=%s", key_id)


def get_public_key_for_key_id(db: Session, key_id: str) -> str | None:
    """The historical lookup that makes verification correct across a
    rotation: resolves the public key that was actually active when a
    given Evidence/audit record's key_id was signed, not whatever key
    happens to be configured right now. Returns None if this key_id was
    never registered (callers should fall back to the current key for
    backward compatibility with any record predating this table, then
    treat a continued miss as a real verification failure)."""
    row = db.get(SigningKey, key_id)
    return row.public_key_b64 if row else None


def list_signing_keys(db: Session) -> list[SigningKey]:
    """Every key ever used, active and retired, oldest first -- the
    full history a regulator or auditor needs to independently verify
    any record regardless of when it was signed."""
    return list(db.scalars(select(SigningKey).order_by(SigningKey.created_at)))
