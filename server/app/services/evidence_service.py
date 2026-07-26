import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Evidence
from app.domain.evidence.signing import Signature, public_key_b64_from_signing_key_b64, verify_payload
from app.services import signing_key_service

logger = logging.getLogger("payreality.evidence")


class EvidenceNotFoundError(Exception):
    pass


def get_evidence(db: Session, evidence_id: uuid.UUID) -> Evidence | None:
    return db.get(Evidence, evidence_id)


def list_evidence(db: Session, decision_id: uuid.UUID | None = None) -> list[Evidence]:
    stmt = select(Evidence)
    if decision_id is not None:
        stmt = stmt.where(Evidence.decision_id == decision_id)
    return list(db.scalars(stmt.order_by(Evidence.created_at)))


def verify_evidence(db: Session, evidence_id: uuid.UUID) -> tuple[bool, str]:
    """spec 17.5. A False result is a P1-severity signal for the caller to
    surface, not something this function itself escalates: verification
    is a query, not an alerting action.

    Resolves the public key by `evidence.key_id` through the signing-key
    registry (EVIDENCE_KEY_ROTATION.md), not from whatever key is
    currently configured: this is what keeps a record verifiable across
    a key rotation. Falling back to deriving from the current key when
    a key_id has no registry entry is a defensive safety net (should not
    happen once `ensure_current_key_registered` has run at least once),
    never a regression from this table's pre-registry behavior.
    """
    evidence = db.get(Evidence, evidence_id)
    if evidence is None:
        raise EvidenceNotFoundError(str(evidence_id))

    public_key = signing_key_service.get_public_key_for_key_id(db, evidence.key_id)
    if public_key is None:
        logger.warning(
            "signing_key_registry_miss evidence_id=%s key_id=%s: falling back to the "
            "currently configured key. This should not happen once the registry has "
            "been seeded; investigate if it recurs.",
            evidence_id, evidence.key_id,
        )
        public_key = public_key_b64_from_signing_key_b64(settings.evidence_signing_key_b64)
    signature = Signature(algorithm="ed25519", key_id=evidence.key_id, value=evidence.signature)
    valid = verify_payload(evidence.payload, signature, public_key)
    return valid, evidence.key_id
