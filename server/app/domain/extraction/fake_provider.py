"""Deterministic fake ExtractionProvider for tests and for exercising the
pipeline without an ANTHROPIC_API_KEY configured."""

from app.domain.extraction.provider import CandidateAuthority


class FakeExtractionProvider:
    def __init__(self, candidates: list[CandidateAuthority] | None = None):
        self._candidates = candidates or [
            CandidateAuthority(
                principal_name="Regional Controller (EMEA)",
                scope="vendor_payment",
                limit_amount=50000.0,
                currency="USD",
                conditions=["requires_dual_approval_above_25000"],
                source_excerpt="The Regional Controller may approve vendor payments up to $50,000.",
                source_page=4,
            )
        ]

    def extract(self, document_text_by_page: list[str]) -> list[CandidateAuthority]:
        return list(self._candidates)
