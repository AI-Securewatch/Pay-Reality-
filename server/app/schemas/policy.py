from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    document_id: UUID
    name: str
    status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, doc):
        return cls(
            document_id=doc.id, name=doc.name, status=doc.status, uploaded_at=doc.uploaded_at
        )


class AuthorityResponse(BaseModel):
    authority_id: UUID
    document_id: UUID
    principal_id: UUID
    scope: str
    limit_amount: float | None
    currency: str | None
    conditions: list[Any]
    source_excerpt: str | None
    source_page: int | None
    status: str
    reviewer_id: str | None
    rejection_reason: str | None
    validation_flags: list[str] = []

    @classmethod
    def from_model(cls, a, flags: list[str] | None = None):
        return cls(
            authority_id=a.id,
            document_id=a.document_id,
            principal_id=a.principal_id,
            scope=a.scope,
            limit_amount=float(a.limit_amount) if a.limit_amount is not None else None,
            currency=a.currency,
            conditions=a.conditions or [],
            source_excerpt=a.source_excerpt,
            source_page=a.source_page,
            status=a.status,
            reviewer_id=str(a.reviewer_id) if a.reviewer_id else None,
            rejection_reason=a.rejection_reason,
            validation_flags=flags or [],
        )


class ReviewAuthorityRequest(BaseModel):
    status: str  # "approved" | "rejected"
    reviewer_id: str
    edits: dict[str, Any] | None = None
    rejection_reason: str | None = None


class CompilePolicyResponse(BaseModel):
    policy_id: UUID
    version: int
    status: str
    bundle_hash: str
    mandate_count: int


class ActivatePolicyResponse(BaseModel):
    policy_id: UUID
    version: int
    status: str
    activated_at: datetime | None
    previous_version: int | None


class PolicyResponse(BaseModel):
    policy_id: UUID
    version: int
    status: str
    bundle_hash: str
    compiled_at: datetime | None
    activated_at: datetime | None
    retired_at: datetime | None

    @classmethod
    def from_model(cls, p):
        return cls(
            policy_id=p.id,
            version=p.version,
            status=p.status,
            bundle_hash=p.bundle_hash,
            compiled_at=p.compiled_at,
            activated_at=p.activated_at,
            retired_at=p.retired_at,
        )
