from app.domain.ai_policy_builder.fake_provider import FakeRuntimePolicyExtractionProvider
from app.domain.ai_policy_builder.provider import CandidateCondition, CandidateRuntimePolicy


def test_fake_provider_returns_a_default_candidate_with_confidence_and_citation():
    candidates = FakeRuntimePolicyExtractionProvider().extract("irrelevant text")
    assert len(candidates) == 1
    c = candidates[0]
    assert c.action == "vendor_payment"
    assert 0.0 <= c.confidence <= 1.0
    assert c.source_excerpt
    assert c.source_location


def test_fake_provider_accepts_custom_candidates():
    custom = [
        CandidateRuntimePolicy(
            name="Test",
            principal="Someone",
            action="wire_transfer",
            effect="deny",
            confidence=0.4,
            source_excerpt="excerpt",
            source_location="page 1",
            conditions=(CandidateCondition(field="amount", operator=">", value=1000000),),
            missing_fields=("resource",),
        )
    ]
    candidates = FakeRuntimePolicyExtractionProvider(custom).extract("text")
    assert candidates == custom


def test_candidate_runtime_policy_has_no_rego_field():
    """Structural check backing AI_POLICY_BUILDER_ARCHITECTURE.md's "the
    AI never generates Rego": the canonical candidate shape has nowhere
    for Rego, source code, or a compiler target to live."""
    field_names = CandidateRuntimePolicy.__dataclass_fields__.keys()
    assert not any("rego" in f.lower() or "code" in f.lower() for f in field_names)
