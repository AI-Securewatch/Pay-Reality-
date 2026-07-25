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
