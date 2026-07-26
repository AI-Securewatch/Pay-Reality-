"""RuntimePolicyExtractionProvider interface: the AI Policy Builder's own
vendor-neutrality boundary (AI_POLICY_BUILDER_ARCHITECTURE.md), a
deliberate sibling of domain/extraction/provider.py's ExtractionProvider,
not a reuse of it: that protocol produces CandidateAuthority, for the
separate DoA-document-to-Authority-claim pipeline. This one produces
CandidateRuntimePolicy, for RuntimePolicy candidates. Conflating the two
would couple two independent domains for no benefit.
"""

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class CandidateCondition:
    field: str
    operator: str
    value: object


@dataclass(frozen=True)
class CandidateRuntimePolicy:
    """Canonical shape every RuntimePolicyExtractionProvider implementation
    must produce (RUNTIME_POLICY_MAPPING.md), regardless of which model
    generated it. Confidence and missing_fields are the model's own,
    uncalibrated self-report (AI_POLICY_BUILDER_ARCHITECTURE.md's "Honesty
    about what confidence means"), never assumed accurate."""

    name: str
    principal: str
    action: str
    effect: str
    confidence: float
    source_excerpt: str
    source_location: str
    resource: str | None = None
    conditions: tuple[CandidateCondition, ...] = field(default_factory=tuple)
    delegated_by: str | None = None
    evidence_required: bool | None = None
    risk_level: str | None = None
    metadata_owner: str | None = None
    metadata_tags: tuple[str, ...] = field(default_factory=tuple)
    missing_fields: tuple[str, ...] = field(default_factory=tuple)


class RuntimePolicyExtractionProvider(Protocol):
    def extract(self, document_text: str) -> list[CandidateRuntimePolicy]: ...
