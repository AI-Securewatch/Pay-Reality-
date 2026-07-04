from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.domain.compiler.compiler import CompilationConflictError
from app.domain.extraction.claude_provider import ClaudeExtractionProvider
from app.domain.extraction.fake_provider import FakeExtractionProvider
from app.schemas.policy import (
    ActivatePolicyResponse,
    AuthorityResponse,
    CompilePolicyResponse,
    DocumentResponse,
    PolicyResponse,
    ReviewAuthorityRequest,
)
from app.services import document_service, policy_service, review_service
from app.services.policy_service import (
    BundleHashMismatchError,
    NoApprovedAuthoritiesError,
    PolicyNotFoundError,
    StaticValidationError,
)
from app.services.review_service import AuthorityNotFoundError, AuthorityNotPendingReviewError

router = APIRouter(prefix="/v1/policies", tags=["policies"])


def _extraction_provider():
    if settings.anthropic_api_key:
        return ClaudeExtractionProvider()
    return FakeExtractionProvider()


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return [DocumentResponse.from_model(d) for d in document_service.list_documents(db)]


@router.post("/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(file: UploadFile, db: Session = Depends(get_db)):
    """spec 19.1. Extraction (spec 12.4 Stage 2-3) runs synchronously here
    for Phase 1 simplicity -- a document transitions extraction_pending ->
    extracted|extraction_failed within this same request."""
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=422, detail="unsupported_format")

    pdf_bytes = await file.read()
    document = document_service.store_document(db, name=file.filename or "document", pdf_bytes=pdf_bytes)

    try:
        document_service.run_extraction(db, document, _extraction_provider())
    except Exception:
        # document.status is already extraction_failed at this point; the
        # caller may retry extraction without re-uploading (spec 12.4 Stage 2).
        pass

    return DocumentResponse.from_model(document)


@router.get("/authorities", response_model=list[AuthorityResponse])
def list_authorities(
    document_id: UUID | None = None, status: str | None = None, db: Session = Depends(get_db)
):
    """spec 19.2."""
    items = review_service.list_authorities_for_review(db, document_id=document_id, status=status)
    return [AuthorityResponse.from_model(i.authority, i.validation_flags) for i in items]


@router.patch("/authorities/{authority_id}", response_model=AuthorityResponse)
def review_authority(
    authority_id: UUID, body: ReviewAuthorityRequest, db: Session = Depends(get_db)
):
    """spec 19.2 / Section 13."""
    try:
        if body.status == "approved":
            authority = review_service.approve_authority(
                db, authority_id, reviewer_id=body.reviewer_id, edits=body.edits
            )
        elif body.status == "rejected":
            if not body.rejection_reason:
                raise HTTPException(status_code=422, detail="rejection_reason_required")
            authority = review_service.reject_authority(
                db, authority_id, reviewer_id=body.reviewer_id, rejection_reason=body.rejection_reason
            )
        else:
            raise HTTPException(status_code=422, detail="invalid_status")
    except AuthorityNotFoundError:
        raise HTTPException(status_code=404, detail="authority_not_found")
    except AuthorityNotPendingReviewError as e:
        raise HTTPException(status_code=409, detail=f"authority_not_pending_review:{e}")

    return AuthorityResponse.from_model(authority)


@router.post("/{document_id}/compile", response_model=CompilePolicyResponse)
def compile_policy(document_id: UUID, db: Session = Depends(get_db)):
    """spec 19.3."""
    try:
        policy = policy_service.compile_document(db, document_id)
    except NoApprovedAuthoritiesError:
        raise HTTPException(status_code=422, detail="no_approved_authorities")
    except CompilationConflictError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": "compilation_conflict", "authority_ids": e.conflicting_authority_ids},
        )
    except StaticValidationError as e:
        raise HTTPException(status_code=422, detail=f"static_validation_failed:{e}")

    from sqlalchemy import select

    from app.db.models import Mandate

    mandate_count = len(list(db.scalars(select(Mandate).where(Mandate.policy_id == policy.id))))

    return CompilePolicyResponse(
        policy_id=policy.id,
        version=policy.version,
        status=policy.status,
        bundle_hash=policy.bundle_hash,
        mandate_count=mandate_count,
    )


@router.post("/{policy_id}/activate", response_model=ActivatePolicyResponse)
def activate_policy(policy_id: UUID, db: Session = Depends(get_db)):
    """spec 19.3 + 14.4 (also used for rollback -- reactivating a retired
    version's id)."""
    from sqlalchemy import select

    from app.db.models import Policy

    previous = db.scalar(select(Policy).where(Policy.status == "active"))
    previous_version = previous.version if previous else None

    try:
        policy = policy_service.activate_policy(db, policy_id)
    except PolicyNotFoundError:
        raise HTTPException(status_code=404, detail="policy_not_found")
    except BundleHashMismatchError as e:
        raise HTTPException(status_code=503, detail=f"activation_failed:{e}")

    return ActivatePolicyResponse(
        policy_id=policy.id,
        version=policy.version,
        status=policy.status,
        activated_at=policy.activated_at,
        previous_version=previous_version,
    )


@router.get("", response_model=list[PolicyResponse])
def list_policies(db: Session = Depends(get_db)):
    return [PolicyResponse.from_model(p) for p in policy_service.list_policies(db)]
