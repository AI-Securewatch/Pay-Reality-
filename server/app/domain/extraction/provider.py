"""ExtractionProvider interface -- spec Section 18's vendor-neutrality
requirement (Principle 7, spec Section 4): the policy pipeline depends on
this interface, never on a specific model provider directly.

Per spec 12.4 Stage 2+3, an implementation is responsible for BOTH the raw
extraction AND normalizing its own provider-specific output into this
canonical CandidateAuthority shape -- that responsibility split is exactly
what "Extraction Service... converts raw model output into candidate
Authority JSON conforming to the internal schema" (spec Section 18) means.
"""

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class CandidateAuthority:
    """Canonical shape every ExtractionProvider implementation must produce,
    regardless of which model generated it (spec 12.4 Stage 3)."""

    principal_name: str
    scope: str
    limit_amount: float | None
    currency: str | None
    conditions: list[str]
    source_excerpt: str
    source_page: int
    # Populated when a raw claim is missing a required field -- surfaced to
    # the reviewer rather than silently dropped or defaulted (spec 12.4
    # Stage 3's recovery strategy).
    incomplete_fields: list[str] = field(default_factory=list)


class ExtractionProvider(Protocol):
    def extract(self, document_text_by_page: list[str]) -> list[CandidateAuthority]: ...
