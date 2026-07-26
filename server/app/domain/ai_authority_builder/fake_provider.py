"""Deterministic fake AuthorityGraphExtractionProvider for tests and for
running the AI Authority Builder without an ANTHROPIC_API_KEY configured,
the same role every other domain's fake_provider.py already plays."""

from app.domain.ai_authority_builder.provider import (
    AuthorityGraph,
    CandidateConflict,
    CandidateGap,
    CandidateOperation,
    CandidatePrincipal,
    CandidateQuestion,
    CandidateRelationship,
    CandidateResource,
)
from app.domain.ai_policy_builder.provider import CandidateCondition, CandidateRuntimePolicy


class FakeAuthorityGraphExtractionProvider:
    def __init__(self, graph: AuthorityGraph | None = None):
        self._graph = graph or AuthorityGraph(
            policies=(
                CandidateRuntimePolicy(
                    name="Regional Controller EMEA - Vendor Payment Limit",
                    principal="Regional Controller, EMEA",
                    action="vendor_payment",
                    effect="require_human_review",
                    confidence=0.9,
                    source_excerpt="The Regional Controller may approve vendor payments up to $50,000.",
                    source_location="FILE: doa_memo.txt, page 1",
                    conditions=(CandidateCondition(field="amount", operator="<=", value=50000),),
                    evidence_required=True,
                    metadata_tags=("finance",),
                ),
            ),
            principals=(
                CandidatePrincipal(
                    name="Regional Controller, EMEA",
                    role="Finance",
                    reports_to="CFO",
                    confidence=0.85,
                    source_excerpt="The Regional Controller may approve vendor payments up to $50,000.",
                    source_location="FILE: doa_memo.txt, page 1",
                ),
            ),
            resources=(
                CandidateResource(
                    name="Vendor Payment",
                    description="A payment made to an external vendor.",
                    confidence=0.9,
                    source_excerpt="vendor payments up to $50,000",
                    source_location="FILE: doa_memo.txt, page 1",
                ),
            ),
            operations=(
                CandidateOperation(
                    name="Approve",
                    confidence=0.9,
                    source_excerpt="may approve vendor payments",
                    source_location="FILE: doa_memo.txt, page 1",
                ),
            ),
            relationships=(
                CandidateRelationship(
                    kind="delegation",
                    from_principal="CFO",
                    to_principal="Regional Controller, EMEA",
                    description="CFO delegates vendor payment approval to Regional Controllers.",
                    confidence=0.7,
                    source_excerpt="The Regional Controller may approve vendor payments up to $50,000.",
                    source_location="FILE: doa_memo.txt, page 1",
                ),
            ),
            conflicts=(),
            gaps=(
                CandidateGap(
                    description="No escalation path is defined for vendor payments above $50,000.",
                    confidence=0.6,
                    source_excerpt=None,
                    source_location=None,
                ),
            ),
            questions=(
                CandidateQuestion(
                    question="Who approves vendor payments above $50,000?",
                    context="The document defines a limit but no escalation authority above it.",
                ),
            ),
        )

    def extract(self, corpus_text: str) -> AuthorityGraph:
        return self._graph
