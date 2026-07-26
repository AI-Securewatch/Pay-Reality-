"""Unit tests for ai_policy_builder_service's pure, DB-free core:
candidate_to_content() and build_runtime_policy_from_candidate(). The
rest of the service (uploads, extraction orchestration, candidate CRUD,
promotion) genuinely requires a live database session and is verified
against the real deployed Postgres instance instead (see
AI_POLICY_BUILDER_ARCHITECTURE.md), the same split
test_runtime_policy_service_diff.py already established for Policy
Studio's own service layer."""

from app.domain.ai_policy_builder.provider import CandidateCondition, CandidateRuntimePolicy
from app.domain.runtime_policy.runtime_policy import PolicyStatus
from app.domain.runtime_policy.validators import validate
from app.services.ai_policy_builder_service import build_runtime_policy_from_candidate, candidate_to_content


def _candidate(**overrides):
    defaults = dict(
        name="Regional Controller EMEA - Vendor Payment Limit",
        principal="Regional Controller, EMEA",
        action="vendor_payment",
        effect="require_human_review",
        confidence=0.9,
        source_excerpt="The Regional Controller may approve vendor payments up to $50,000.",
        source_location="page 1",
        conditions=(CandidateCondition(field="amount", operator="<=", value=50000),),
    )
    defaults.update(overrides)
    return CandidateRuntimePolicy(**defaults)


def test_candidate_to_content_matches_runtime_policy_request_shape():
    content = candidate_to_content(_candidate())
    assert content["name"] == "Regional Controller EMEA - Vendor Payment Limit"
    assert content["scope"] == {
        "principal": "Regional Controller, EMEA",
        "action": "vendor_payment",
        "agent": None,
        "resource": None,
    }
    assert content["conditions"] == [{"field": "amount", "operator": "<=", "value": 50000}]
    assert content["effect"] == "require_human_review"


def test_candidate_to_content_always_tags_ai_extracted_and_sets_created_by():
    content = candidate_to_content(_candidate(metadata_tags=("finance",)))
    assert "ai-extracted" in content["metadata"]["tags"]
    assert "finance" in content["metadata"]["tags"]
    assert content["metadata"]["created_by"] == "ai_policy_builder"


def test_candidate_to_content_never_duplicates_ai_extracted_tag():
    content = candidate_to_content(_candidate(metadata_tags=("ai-extracted",)))
    assert content["metadata"]["tags"].count("ai-extracted") == 1


def test_candidate_to_content_defaults_evidence_required_true_when_unstated():
    content = candidate_to_content(_candidate(evidence_required=None))
    assert content["constraints"]["evidence_required"] is True


def test_candidate_to_content_expires_is_always_null():
    """PROMPT_LIBRARY.md's deliberate omission: the AI is never asked for
    an expiry, and this must never leak a fabricated one through."""
    content = candidate_to_content(_candidate())
    assert content["constraints"]["expires"] is None


def test_build_runtime_policy_from_candidate_produces_a_valid_draft():
    content = candidate_to_content(_candidate())
    policy = build_runtime_policy_from_candidate(content)
    assert policy.status == PolicyStatus.DRAFT
    assert policy.version == 1
    assert policy.audit is not None
    assert policy.audit.created is not None
    result = validate(policy)
    assert result.ok, result.errors


def test_build_runtime_policy_from_candidate_rejects_an_unsupported_operator_at_validation():
    content = candidate_to_content(_candidate())
    content["conditions"] = [{"field": "amount", "operator": "not_a_real_operator", "value": 1}]
    try:
        build_runtime_policy_from_candidate(content)
        assert False, "expected a ValueError constructing the Operator"
    except ValueError:
        pass
