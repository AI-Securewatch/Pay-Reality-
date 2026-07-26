from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.runtime_policy import ConditionSchema, ConstraintsSchema, MetadataSchema, ScopeSchema


class CandidateContentSchema(BaseModel):
    """The RuntimePolicyRequest-shaped content stored on a candidate
    (RUNTIME_POLICY_MAPPING.md); reuses Policy Studio's own field schemas
    by import rather than redefining them."""

    name: str
    description: str | None = None
    scope: ScopeSchema
    conditions: list[ConditionSchema] = []
    effect: str
    constraints: ConstraintsSchema = ConstraintsSchema()
    metadata: MetadataSchema = MetadataSchema()


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    format: str
    status: str
    error: str | None
    uploaded_at: datetime


class CandidateResponse(BaseModel):
    candidate_id: str
    upload_id: str
    content: CandidateContentSchema
    confidence: float
    missing_fields: list[str]
    source_excerpt: str | None
    source_location: str | None
    status: str
    promoted_policy_key: str | None
    created_at: datetime


class EditCandidateRequest(BaseModel):
    content: CandidateContentSchema


class PromoteCandidateResponse(BaseModel):
    policy_key: str
    version: int
    status: str


class ValidationErrorSchema(BaseModel):
    field: str
    code: str
    message: str
