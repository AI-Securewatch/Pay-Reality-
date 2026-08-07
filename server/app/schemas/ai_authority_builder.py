from datetime import datetime

from pydantic import BaseModel


class ProviderStatusResponse(BaseModel):
    """Whether extraction is currently backed by a real LLM (Claude) or
    the deterministic fake provider, so the frontend can be honest about
    which one a given deployment is running."""

    ai_enabled: bool


class CorpusResponse(BaseModel):
    corpus_id: str
    name: str
    status: str
    error: str | None
    document_count: int
    created_at: datetime


class PrincipalResponse(BaseModel):
    id: str
    name: str
    role: str | None
    reports_to: str | None
    confidence: float
    source_excerpt: str | None
    source_location: str | None
    # Authority-as-a-continuous-object, Stage E: None until a reviewer
    # resolves this discovery to a real Principal (match or create).
    resolved_principal_id: str | None = None


class PrincipalCandidateResponse(BaseModel):
    """A real, existing Principal that might be the same person/role this
    discovery describes, offered as a suggestion only -- never applied
    without a reviewer explicitly confirming via ResolvePrincipalRequest."""

    id: str
    name: str
    role: str | None
    organization_id: str | None


class ResolvePrincipalRequest(BaseModel):
    """Stage E's reviewer workflow. `action="match"` requires
    `principal_id` (one of the candidates offered, or any other real
    Principal id the reviewer already knows); `action="create"` makes a
    new Principal from this discovery's own name/role, optionally
    overridden."""

    action: str  # "match" | "create"
    principal_id: str | None = None
    name: str | None = None
    role: str | None = None


class ResourceResponse(BaseModel):
    id: str
    name: str
    description: str | None
    confidence: float
    source_excerpt: str | None
    source_location: str | None


class OperationResponse(BaseModel):
    id: str
    name: str
    description: str | None
    confidence: float
    source_excerpt: str | None
    source_location: str | None


class RelationshipResponse(BaseModel):
    id: str
    kind: str
    from_principal: str
    to_principal: str
    description: str | None
    confidence: float
    source_excerpt: str | None
    source_location: str | None
    # Authority-as-a-continuous-object, Stage F: populated once resolution
    # finds a matching, already-resolved Principal on each side. status
    # stays "proposed" (the schema's own existing default) until a
    # reviewer explicitly activates it -- resolving the names into real
    # ids and deciding this delegation should actually govern live
    # enforcement are two different, deliberately separate steps.
    from_principal_id: str | None = None
    to_principal_id: str | None = None
    status: str = "proposed"


class ConflictResponse(BaseModel):
    id: str
    description: str
    reasoning: str | None
    confidence: float


class GapResponse(BaseModel):
    id: str
    description: str
    confidence: float
    source_excerpt: str | None
    source_location: str | None


class QuestionResponse(BaseModel):
    id: str
    question: str
    context: str | None
    answered: bool
    answer: str | None


class AnswerQuestionRequest(BaseModel):
    answer: str


class GraphSummaryResponse(BaseModel):
    """The headline counts (AI_AUTHORITY_BUILDER_ARCHITECTURE.md's own
    example: "237 Runtime Policies, 18 Principals..."), computed from the
    same per-category list endpoints, not a separately maintained
    number."""

    policy_count: int
    principal_count: int
    resource_count: int
    operation_count: int
    relationship_count: int
    conflict_count: int
    gap_count: int
    question_count: int
