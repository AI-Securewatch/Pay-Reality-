from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.evidence import EvidenceResponse, VerifyEvidenceResponse
from app.services import evidence_service
from app.services.evidence_service import EvidenceNotFoundError

router = APIRouter(prefix="/v1/evidence", tags=["evidence"])


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: UUID, db: Session = Depends(get_db)):
    """spec 19.6."""
    evidence = evidence_service.get_evidence(db, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=404, detail="evidence_not_found")
    return EvidenceResponse.from_model(evidence)


@router.get("", response_model=list[EvidenceResponse])
def list_evidence(decision_id: UUID | None = None, db: Session = Depends(get_db)):
    """spec 19.6."""
    return [EvidenceResponse.from_model(e) for e in evidence_service.list_evidence(db, decision_id)]


@router.post("/{evidence_id}/verify", response_model=VerifyEvidenceResponse)
def verify_evidence(evidence_id: UUID, db: Session = Depends(get_db)):
    """spec 19.7 / 17.5. A False result indicates tampering or corruption
    and must be treated as a P1 operational incident by the caller."""
    try:
        valid, key_id = evidence_service.verify_evidence(db, evidence_id)
    except EvidenceNotFoundError:
        raise HTTPException(status_code=404, detail="evidence_not_found")

    return VerifyEvidenceResponse(
        evidence_id=evidence_id,
        valid=valid,
        verified_at=datetime.now(timezone.utc),
        key_id=key_id,
    )
