from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CreatePrincipalRequest(BaseModel):
    """Not in the spec's literal API surface (Section 19); Principals are
    normally created implicitly during document onboarding (spec 8.2's
    lifecycle: "Created when a DoA document is onboarded"). This endpoint is
    a Phase 1 convenience so an Agent/Mandate can be bootstrapped and tested
    before any document has been uploaded and reviewed."""

    name: str


class PrincipalResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateAgentRequest(BaseModel):
    """spec 19.4."""

    name: str
    acting_for_principal_id: UUID
    public_key: str
    owner: str | None = None
    description: str | None = None


class AgentResponse(BaseModel):
    """spec 19.4 response shape, extended with fields the Live UI needs to
    list/manage agents."""

    id: UUID
    certificate_id: UUID | None = None
    name: str
    acting_for_principal_id: UUID
    status: str
    owner: str | None = None
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
