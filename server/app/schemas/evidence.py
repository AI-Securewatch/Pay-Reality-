from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class EvidenceResponse(BaseModel):
    """spec 17.1 + 19.6."""

    evidence_id: UUID
    decision_id: UUID
    payload: dict[str, Any]
    key_id: str
    signature: str
    status: str
    created_at: datetime

    @classmethod
    def from_model(cls, e):
        return cls(
            evidence_id=e.id,
            decision_id=e.decision_id,
            payload=e.payload,
            key_id=e.key_id,
            signature=e.signature,
            status=e.status,
            created_at=e.created_at,
        )


class VerifyEvidenceResponse(BaseModel):
    """spec 19.7."""

    evidence_id: UUID
    valid: bool
    verified_at: datetime
    key_id: str


class VerificationKeyResponse(BaseModel):
    """The public half of the ED25519 keypair Evidence is signed with, so a
    third party can verify a signature without trusting this API's own
    /verify result."""

    key_id: str
    algorithm: str
    public_key_b64: str


class SigningKeyHistoryEntry(BaseModel):
    """One row from the signing-key registry (EVIDENCE_KEY_ROTATION.md):
    every key ever used to sign Evidence/audit events, active or
    retired. Needed for offline verification of a record signed under a
    key that isn't the currently active one."""

    key_id: str
    algorithm: str
    public_key_b64: str
    created_at: datetime
    retired_at: datetime | None
    active: bool


class VerificationKeyHistoryResponse(BaseModel):
    keys: list[SigningKeyHistoryEntry]


class ChainVerificationResponse(BaseModel):
    """PHASE_5_EVIDENCE.md: independent verification of an Organisation-
    scoped range of Evidence, both per-record signature validity and
    previous_hash continuity -- catches a deleted or reordered record,
    which per-record signature verification alone cannot."""

    organization_id: UUID | None
    total: int
    intact: bool
    invalid_signatures: list[UUID]
    broken_links: list[UUID]
