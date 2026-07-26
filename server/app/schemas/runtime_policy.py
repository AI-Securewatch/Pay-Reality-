from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ScopeSchema(BaseModel):
    principal: str
    action: str
    agent: str | None = None
    resource: str | None = None


class ConditionSchema(BaseModel):
    field: str
    operator: str
    value: Any


class ConstraintsSchema(BaseModel):
    delegated_by: str | None = None
    expires: datetime | None = None
    evidence_required: bool = True
    risk_level: str | None = None


class MetadataSchema(BaseModel):
    owner: str | None = None
    created_by: str | None = None
    tags: list[str] = []


class RuntimePolicyRequest(BaseModel):
    """The request body for creating or editing a RuntimePolicy. `id` is
    intentionally absent: the server assigns policy_key on create, and
    edit is addressed by policy_key in the URL, not the body (see
    POLICY_STUDIO_ARCHITECTURE.md's API surface)."""

    name: str
    description: str | None = None
    scope: ScopeSchema
    conditions: list[ConditionSchema] = []
    effect: str
    constraints: ConstraintsSchema = ConstraintsSchema()
    metadata: MetadataSchema = MetadataSchema()


class RuntimePolicyResponse(BaseModel):
    policy_key: str
    version: int
    status: str
    name: str
    description: str | None
    scope: ScopeSchema
    conditions: list[ConditionSchema]
    effect: str
    constraints: ConstraintsSchema
    metadata: MetadataSchema
    audit: dict[str, Any] | None
    bundle_id: str | None
    bundle_hash: str | None
    created_at: datetime


class RejectRequest(BaseModel):
    reviewer: str
    reason: str


class ApproveRequest(BaseModel):
    approver: str


class CompilerErrorSchema(BaseModel):
    code: str
    message: str
    policy_id: str | None
    path: str | None


class CompileResponse(BaseModel):
    ok: bool
    errors: list[CompilerErrorSchema]
    bundle_id: str | None
    bundle_hash: str | None


class DryRunRequest(BaseModel):
    principal: str
    action: str
    resource: str | None = None
    context: dict[str, Any] = {}


class DryRunResponse(BaseModel):
    decision: str
    allow: bool
    deny: bool
    requires_review: bool
    evaluated_mandates: list[str]
    review_reason: str | None
    deny_reason: str | None
    evidence_required: bool


class DeployResponse(BaseModel):
    bundle_id: str
    bundle_hash: str
    deployed_at: datetime


class ConditionDiffSchema(BaseModel):
    kind: str
    field: str
    operator: str
    old_value: Any = None
    new_value: Any = None


class AffectedAgentSchema(BaseModel):
    id: str
    name: str


class AffectedPolicySchema(BaseModel):
    policy_key: str
    name: str
    version: int
    status: str
    same_action: bool


class DiffResponse(BaseModel):
    conditions: list[ConditionDiffSchema]
    scope_changed: bool
    effect_changed: bool
    constraints_changed: bool
    affected_agents: list[AffectedAgentSchema]
    affected_policies: list[AffectedPolicySchema]
    risk_impact: str
    risk_reason: str
