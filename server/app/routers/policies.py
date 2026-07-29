from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import require_permission
from app.domain.rbac.permissions import Permission
from app.schemas.policy import (
    ActivatePolicyResponse,
    AuthorityResponse,
    CompilePolicyResponse,
    DocumentResponse,
    PolicyResponse,
    ReviewAuthorityRequest,
)
from app.services import document_service, policy_service, review_service

router = APIRouter(prefix="/v1/policies", tags=["policies"])


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return [DocumentResponse.from_model(d) for d in document_service.list_documents(db)]


_RETIRED_DETAIL = (
    "retired: this legacy Authority/Mandate authoring path is disabled "
    "(PHASE_0.md) -- author and deploy Runtime Policies via /v1/runtime-policies "
    "instead. Read-only endpoints on this router (list documents/authorities/policies) "
    "remain available for historical/audit access."
)


@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=201,
    dependencies=[Depends(require_permission(Permission.RUNTIME_POLICY_CREATE))],
)
async def upload_document(file: UploadFile, db: Session = Depends(get_db)):
    """Retired (PHASE_0.md): this endpoint fed the legacy Authority/Mandate
    pipeline, which independently wrote to the same OPA package and the
    same active-Policy-row slot as runtime_policy_service.deploy_policy
    with zero coordination between the two. Confirmed via production data
    (2026-07-29) that zero legacy documents/authorities exist, so no
    backfill was required -- this simply closes the write path rather
    than migrating live data. Kept as a 410, not removed outright, so an
    unexpected caller is observable rather than silently 404ing."""
    raise HTTPException(status_code=410, detail=_RETIRED_DETAIL)


@router.get("/authorities", response_model=list[AuthorityResponse])
def list_authorities(
    document_id: UUID | None = None, status: str | None = None, db: Session = Depends(get_db)
):
    """spec 19.2."""
    items = review_service.list_authorities_for_review(db, document_id=document_id, status=status)
    return [AuthorityResponse.from_model(i.authority, i.validation_flags) for i in items]


@router.patch(
    "/authorities/{authority_id}",
    response_model=AuthorityResponse,
    dependencies=[Depends(require_permission(Permission.AUTHORITY_REVIEW))],
)
def review_authority(
    authority_id: UUID, body: ReviewAuthorityRequest, db: Session = Depends(get_db)
):
    """Retired (PHASE_0.md) -- see upload_document's docstring."""
    raise HTTPException(status_code=410, detail=_RETIRED_DETAIL)


@router.post(
    "/{document_id}/compile",
    response_model=CompilePolicyResponse,
    dependencies=[Depends(require_permission(Permission.RUNTIME_POLICY_EDIT))],
)
def compile_policy(document_id: UUID, db: Session = Depends(get_db)):
    """Retired (PHASE_0.md) -- see upload_document's docstring."""
    raise HTTPException(status_code=410, detail=_RETIRED_DETAIL)


@router.post(
    "/{policy_id}/activate",
    response_model=ActivatePolicyResponse,
    dependencies=[Depends(require_permission(Permission.RUNTIME_POLICY_PUBLISH))],
)
def activate_policy(policy_id: UUID, db: Session = Depends(get_db)):
    """Retired (PHASE_0.md): this was the legacy pipeline's OPA-writing
    endpoint -- the actual source of the two-uncoordinated-writers risk
    PHASE_0.md identifies. See upload_document's docstring."""
    raise HTTPException(status_code=410, detail=_RETIRED_DETAIL)


@router.get("", response_model=list[PolicyResponse])
def list_policies(db: Session = Depends(get_db)):
    return [PolicyResponse.from_model(p) for p in policy_service.list_policies(db)]
