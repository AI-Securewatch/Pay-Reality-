import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, LargeBinary, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    # Every Mapped[datetime] column becomes a real TIMESTAMPTZ, not the bare
    # (server-timezone-dependent) TIMESTAMP. The local Postgres install's
    # server timezone defaulted to Africa/Johannesburg (UTC+2) at initdb
    # time; without this, a timezone-aware Python datetime silently gets
    # converted to server-local wall-clock time on write and loses its
    # offset on read, which broke Mandate valid_from/valid_to comparisons
    # against Intent timestamps in the Rego bundle (both looked like naive
    # ISO strings, but represented different instants).
    type_annotation_map = {datetime: DateTime(timezone=True)}


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class Principal(Base):
    __tablename__ = "principals"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id")
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # spec 12.4 Stage 1: store the byte-identical artifact, never
    # transformed. In the database, not local disk: a container's local
    # filesystem doesn't survive a redeploy or restart, and on the
    # zero-cost pilot deployment it's also owned by root and unwritable
    # by the app's non-root user regardless. Both hit for real running
    # this in production, not theoretical.
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('extraction_pending','extracted','extraction_failed')",
            name="ck_documents_status",
        ),
    )


class Authority(Base):
    __tablename__ = "authorities"

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    principal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("principals.id"), nullable=False
    )
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    limit_amount: Mapped[float | None] = mapped_column(Numeric(18, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    conditions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_page: Mapped[int | None]
    status: Mapped[str] = mapped_column(Text, nullable=False)
    # Free-text identifier, not a FK; there is no user/auth system yet in
    # Phase 1 (see plan's frontend-integration notes); becomes a real FK
    # once login exists.
    reviewer_id: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None]
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    # extracted_* retain the original AI output untouched, per spec 13.7,
    # even after a reviewer edits limit_amount/currency/conditions above.
    extracted_limit_amount: Mapped[float | None] = mapped_column(Numeric(18, 2))
    extracted_currency: Mapped[str | None] = mapped_column(String(3))
    extracted_conditions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_review','approved','rejected')",
            name="ck_authorities_status",
        ),
        Index("idx_authorities_document", "document_id"),
        Index("idx_authorities_status", "status"),
    )


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = uuid_pk()
    version: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    bundle_hash: Mapped[str] = mapped_column(Text, nullable=False)
    bundle_uri: Mapped[str] = mapped_column(Text, nullable=False)
    compiled_at: Mapped[datetime | None]
    activated_at: Mapped[datetime | None]
    retired_at: Mapped[datetime | None]

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','compiled','active','retired')",
            name="ck_policies_status",
        ),
        UniqueConstraint("version", name="uq_policies_version"),
        # Partial unique index enforcing "exactly one active Policy" (spec 12.4 Stage 9 / 20.2).
        Index(
            "idx_policies_single_active",
            "status",
            unique=True,
            postgresql_where="status = 'active'",
        ),
    )


class Mandate(Base):
    __tablename__ = "mandates"

    id: Mapped[uuid.UUID] = uuid_pk()
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False
    )
    authority_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authorities.id"), nullable=False
    )
    principal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("principals.id"), nullable=False
    )
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    max_amount: Mapped[float | None] = mapped_column(Numeric(18, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    review_threshold: Mapped[float | None] = mapped_column(Numeric(18, 2))
    valid_from: Mapped[datetime] = mapped_column(nullable=False)
    valid_to: Mapped[datetime] = mapped_column(nullable=False)

    __table_args__ = (
        Index("idx_mandates_policy", "policy_id"),
        Index("idx_mandates_principal_scope", "principal_id", "scope"),
    )


class Constraint(Base):
    __tablename__ = "constraints"

    id: Mapped[uuid.UUID] = uuid_pk()
    mandate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mandates.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)

    __table_args__ = (Index("idx_constraints_mandate", "mandate_id"),)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    acting_for_principal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("principals.id"), nullable=False
    )
    owner: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','suspended','revoked')", name="ck_agents_status"
        ),
    )


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = uuid_pk()
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False
    )
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(server_default=func.now())
    revoked_at: Mapped[datetime | None]

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','rotated','revoked')", name="ck_certificates_status"
        ),
        Index("idx_certificates_agent", "agent_id"),
    )


class Intent(Base):
    __tablename__ = "intents"

    id: Mapped[uuid.UUID] = uuid_pk()
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False
    )
    correlation_id: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 2))
    currency: Mapped[str | None] = mapped_column(String(3))
    counterparty: Mapped[str | None] = mapped_column(Text)
    requested_scope: Mapped[str | None] = mapped_column(Text)
    context: Mapped[dict] = mapped_column(JSONB, nullable=False)
    nonce: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default="{}")
    requested_at: Mapped[datetime] = mapped_column(nullable=False)
    received_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index("idx_intents_agent", "agent_id"),
        UniqueConstraint("agent_id", "nonce", name="uq_intents_agent_nonce"),
    )


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = uuid_pk()
    intent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intents.id"), nullable=False
    )
    policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("policies.id")
    )
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    evaluated_mandates: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "outcome IN ('ALLOW','DENY','HUMAN_REVIEW')", name="ck_decisions_outcome"
        ),
        Index("idx_decisions_intent", "intent_id"),
        Index("idx_decisions_policy", "policy_id"),
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = uuid_pk()
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id"), nullable=False
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    key_id: Mapped[str] = mapped_column(Text, nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    # spec 8.2 EvidenceRecord: VERIFIED|PENDING|REJECTED.
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="PENDING")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index("idx_evidence_decision", "decision_id"),
        CheckConstraint(
            "status IN ('VERIFIED','PENDING','REJECTED')", name="ck_evidence_status"
        ),
    )


class DecisionResolution(Base):
    """Addition beyond the literal spec: closes the HUMAN_REVIEW loop without
    mutating the immutable Decision row (spec 8.2's lifecycle guarantee).
    See plan section "The one addition: resolving HUMAN_REVIEW"."""

    __tablename__ = "decision_resolutions"

    id: Mapped[uuid.UUID] = uuid_pk()
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("decisions.id"), nullable=False, unique=True
    )
    resolution: Mapped[str] = mapped_column(Text, nullable=False)
    resolved_by: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evidence.id")
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "resolution IN ('approved','denied')", name="ck_decision_resolutions_resolution"
        ),
    )


class RuntimePolicyRecord(Base):
    """Persistence for domain/runtime_policy/runtime_policy.py's
    RuntimePolicy (Policy Studio, POLICY_STUDIO_ARCHITECTURE.md). One row
    per version, never mutated after creation, matching RuntimePolicy's
    own immutability: editing produces a new row with an incremented
    version, not an update to an existing one.

    `content` stores the full RuntimePolicy via
    domain/runtime_policy/schema.py's to_dict()/from_dict(), the single
    source of truth for that shape; this table does not re-declare
    RuntimePolicy's fields as separate columns; policy_key/version/status
    are pulled out only because they're what the Policy List, Review
    Queue, and version-history queries actually filter and sort on."""

    __tablename__ = "runtime_policy_records"

    id: Mapped[uuid.UUID] = uuid_pk()
    policy_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    version: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    bundle_id: Mapped[str | None] = mapped_column(Text)
    bundle_hash: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','pending_review','approved','rejected','compiled','active','retired')",
            name="ck_runtime_policy_records_status",
        ),
        UniqueConstraint(
            "policy_key", "version", name="uq_runtime_policy_records_key_version"
        ),
        Index("idx_runtime_policy_records_policy_key", "policy_key"),
        Index("idx_runtime_policy_records_status", "status"),
    )


class PolicyExtractionUpload(Base):
    """AI Policy Builder (AI_POLICY_BUILDER_ARCHITECTURE.md): one row per
    uploaded document. `content` stores the byte-identical original in
    Postgres, the same reason `documents.content` already does: local
    disk does not survive a redeploy and is root-owned in this
    container. Independent of `documents`/`authorities`: that pipeline
    extracts Authority claims for the legacy Mandate model; this one
    extracts RuntimePolicy candidates. Conflating the two tables would
    couple two independent domains for no benefit."""

    __tablename__ = "policy_extraction_uploads"

    id: Mapped[uuid.UUID] = uuid_pk()
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "format IN ('pdf','docx','xlsx','csv','text')",
            name="ck_policy_extraction_uploads_format",
        ),
        CheckConstraint(
            "status IN ('uploaded','extracted','failed')",
            name="ck_policy_extraction_uploads_status",
        ),
    )


class PolicyExtractionCandidate(Base):
    """One row per candidate RuntimePolicy extracted from one upload
    (AI_EXTRACTION_PIPELINE.md Stage 4). `content` is stored in exactly
    schemas/runtime_policy.py's RuntimePolicyRequest JSON shape
    (RUNTIME_POLICY_MAPPING.md), directly editable, directly promotable
    into a real RuntimePolicy via the unmodified
    runtime_policy_service.create_policy. `confidence`/`missing_fields`
    describe the extraction, not the policy, so they live here, not in
    `content`."""

    __tablename__ = "policy_extraction_candidates"

    id: Mapped[uuid.UUID] = uuid_pk()
    # Nullable, plus corpus_id below: a candidate belongs to exactly one of
    # a single-document upload (the original AI Policy Builder) or a
    # multi-document corpus (AI Authority Builder,
    # AI_AUTHORITY_BUILDER_ARCHITECTURE.md), never both, never neither,
    # enforced by the CHECK constraint below. Every row created by the
    # original AI Policy Builder still always sets upload_id, unaffected.
    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("policy_extraction_uploads.id")
    )
    corpus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id")
    )
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    missing_fields: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    promoted_policy_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_review','promoted','dismissed')",
            name="ck_policy_extraction_candidates_status",
        ),
        CheckConstraint(
            "(upload_id IS NOT NULL) != (corpus_id IS NOT NULL)",
            name="ck_policy_extraction_candidates_exactly_one_owner",
        ),
        Index("idx_policy_extraction_candidates_upload", "upload_id"),
        Index("idx_policy_extraction_candidates_corpus", "corpus_id"),
        Index("idx_policy_extraction_candidates_status", "status"),
    )


class AuthorityCorpus(Base):
    """AI Authority Builder (AI_AUTHORITY_BUILDER_ARCHITECTURE.md): one or
    many documents, uploaded and analyzed together as a single body of
    evidence about one organisation's authority structure. Independent of
    `policy_extraction_uploads` (the original, still-unmodified AI Policy
    Builder's single-document table)."""

    __tablename__ = "authority_corpora"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('uploaded','extracted','failed')",
            name="ck_authority_corpora_status",
        ),
    )


class AuthorityCorpusDocument(Base):
    """One uploaded file within a corpus. `content` stored in Postgres for
    the same reason every other document/upload table in this platform
    already does (documents.content, policy_extraction_uploads.content)."""

    __tablename__ = "authority_corpus_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "format IN ('pdf','docx','xlsx','csv','text')",
            name="ck_authority_corpus_documents_format",
        ),
        Index("idx_authority_corpus_documents_corpus", "corpus_id"),
    )


class AuthorityPrincipal(Base):
    """A discovered authority holder (AI_AUTHORITY_BUILDER_ARCHITECTURE.md's
    Authority Graph). Informational: there is no first-class Principal
    table this promotes into; a reviewer references it by name directly
    in a promoted RuntimePolicy's scope.principal, which is already a
    free-form string."""

    __tablename__ = "authority_principals"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str | None] = mapped_column(Text)
    reports_to: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(nullable=False)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_principals_corpus", "corpus_id"),)


class AuthorityResource(Base):
    """A discovered business object (a Resource, in the universal
    vocabulary sense of RESOURCE_MODEL.md). Informational only in this
    phase: see AI_AUTHORITY_BUILDER_ARCHITECTURE.md."""

    __tablename__ = "authority_resources"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(nullable=False)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_resources_corpus", "corpus_id"),)


class AuthorityOperation(Base):
    """A discovered verb (an Operation, in the universal vocabulary sense
    of OPERATION_MODEL.md). Informational only in this phase."""

    __tablename__ = "authority_operations"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(nullable=False)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_operations_corpus", "corpus_id"),)


class AuthorityRelationship(Base):
    """A discovered link between two named principals: delegation,
    escalation, or inheritance. Model-reported, reviewed by a human, not
    a formally verified graph edge."""

    __tablename__ = "authority_relationships"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    from_principal: Mapped[str] = mapped_column(Text, nullable=False)
    to_principal: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(nullable=False)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "kind IN ('delegation','escalation','inheritance')",
            name="ck_authority_relationships_kind",
        ),
        Index("idx_authority_relationships_corpus", "corpus_id"),
    )


class AuthorityConflict(Base):
    """A contradiction or duplication the model noticed across the
    corpus. Model-reported (AI_AUTHORITY_BUILDER_ARCHITECTURE.md: "never
    oversell a heuristic"), never a formal constraint-satisfaction
    proof; always surfaced for human review, never auto-resolved."""

    __tablename__ = "authority_conflicts"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_conflicts_corpus", "corpus_id"),)


class AuthorityGap(Base):
    """Missing information the model expected to find and didn't: an
    undefined approver, an unstated limit, a resource mentioned but
    never scoped."""

    __tablename__ = "authority_gaps"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    source_location: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_gaps_corpus", "corpus_id"),)


class AuthorityQuestion(Base):
    """A clarification question generated for a human reviewer. Not
    confidence-scored: a question is a request for information, not a
    claim to be confident or unconfident about."""

    __tablename__ = "authority_questions"

    id: Mapped[uuid.UUID] = uuid_pk()
    corpus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("authority_corpora.id"), nullable=False
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str | None] = mapped_column(Text)
    answered: Mapped[bool] = mapped_column(nullable=False, server_default="false")
    answer: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (Index("idx_authority_questions_corpus", "corpus_id"),)
