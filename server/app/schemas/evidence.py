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
