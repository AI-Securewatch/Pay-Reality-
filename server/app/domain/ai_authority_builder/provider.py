"""AuthorityGraphExtractionProvider interface: the AI Authority Builder's
extension of domain/ai_policy_builder/provider.py's vendor-neutrality
pattern to a full Authority Graph (AI_AUTHORITY_BUILDER_ARCHITECTURE.md).
CandidateRuntimePolicy is imported and reused unchanged for the one
category both systems share; everything else here is new.
"""

from dataclasses import dataclass, field
from typing import Protocol

from app.domain.ai_policy_builder.provider import CandidateRuntimePolicy


@dataclass(frozen=True)
class CandidatePrincipal:
    name: str
    confidence: float
    source_excerpt: str
    source_location: str
    role: str | None = None
    reports_to: str | None = None


@dataclass(frozen=True)
class CandidateResource:
    name: str
    confidence: float
    source_excerpt: str
    source_location: str
    description: str | None = None


@dataclass(frozen=True)
class CandidateOperation:
    name: str
    confidence: float
    source_excerpt: str
    source_location: str
    description: str | None = None


@dataclass(frozen=True)
class CandidateRelationship:
    """kind is one of delegation/escalation/inheritance
    (AI_AUTHORITY_BUILDER_ARCHITECTURE.md); enforced by the DB check
    constraint, not re-validated as an enum here."""

    kind: str
    from_principal: str
    to_principal: str
    confidence: float
    source_excerpt: str
    source_location: str
    description: str | None = None


@dataclass(frozen=True)
class CandidateConflict:
    """Model-reported, never a formal proof. No source citation: a
    conflict is a relationship between two or more other findings, not a
    single passage in the source text."""

    description: str
    confidence: float
    reasoning: str | None = None


@dataclass(frozen=True)
class CandidateGap:
    description: str
    confidence: float
    source_excerpt: str | None = None
    source_location: str | None = None


@dataclass(frozen=True)
class CandidateQuestion:
    """Not confidence-scored: a question is a request for information,
    not a claim to be confident or unconfident about."""

    question: str
    context: str | None = None


@dataclass(frozen=True)
class AuthorityGraph:
    """The full extraction result for one corpus: every category the
    directive asked for, held to the same confidence/citation standard
    the AI Policy Builder already established for its one category."""

    policies: tuple[CandidateRuntimePolicy, ...] = field(default_factory=tuple)
    principals: tuple[CandidatePrincipal, ...] = field(default_factory=tuple)
    resources: tuple[CandidateResource, ...] = field(default_factory=tuple)
    operations: tuple[CandidateOperation, ...] = field(default_factory=tuple)
    relationships: tuple[CandidateRelationship, ...] = field(default_factory=tuple)
    conflicts: tuple[CandidateConflict, ...] = field(default_factory=tuple)
    gaps: tuple[CandidateGap, ...] = field(default_factory=tuple)
    questions: tuple[CandidateQuestion, ...] = field(default_factory=tuple)


class AuthorityGraphExtractionProvider(Protocol):
    def extract(self, corpus_text: str) -> AuthorityGraph: ...
