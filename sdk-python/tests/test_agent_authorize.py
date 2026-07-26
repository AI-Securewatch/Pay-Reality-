import base64
import json

import nacl.signing
import pytest

from payreality import Agent
from payreality.exceptions import ConfigurationError


def _registered_agent(credentials_path, fake_http_client):
    agent = Agent(api_key="op-key", credentials_path=credentials_path)
    agent._client = fake_http_client
    fake_http_client.queue_response([{"id": "p-1", "name": "Finance Manager"}])
    fake_http_client.queue_response({"id": "a-1", "certificate_id": "c-1"})
    agent.register(name="AP Bot", principal="Finance Manager")
    return agent


def test_authorize_without_registration_raises_configuration_error(credentials_path, fake_http_client):
    agent = Agent(api_key="op-key", credentials_path=credentials_path)
    agent._client = fake_http_client
    with pytest.raises(ConfigurationError):
        agent.authorize(
            principal="Finance Manager",
            operation="Approve",
            resource="Vendor Payment",
            resource_data={"amount": 100},
        )


def test_authorize_rejects_a_principal_mismatch(credentials_path, fake_http_client):
    agent = _registered_agent(credentials_path, fake_http_client)
    with pytest.raises(ConfigurationError):
        agent.authorize(
            principal="Someone Else",
            operation="Approve",
            resource="Vendor Payment",
            resource_data={"amount": 100},
        )


def test_authorize_requires_amount_in_resource_data(credentials_path, fake_http_client):
    agent = _registered_agent(credentials_path, fake_http_client)
    with pytest.raises(ConfigurationError):
        agent.authorize(
            principal="Finance Manager",
            operation="Approve",
            resource="Vendor Payment",
            resource_data={"vendor": "ABC Ltd"},
        )


def test_authorize_maps_resource_to_a_normalized_action(credentials_path, fake_http_client):
    agent = _registered_agent(credentials_path, fake_http_client)
    fake_http_client.queue_response(
        {
            "decision": {"outcome": "ALLOW", "decision_id": "d-1", "reason": None, "evaluated_mandates": []},
            "evidence_id": "e-1",
            "status": "RESOLVED",
        }
    )

    agent.authorize(
        principal="Finance Manager",
        operation="Approve",
        resource="Vendor Payment",
        resource_data={"amount": 85000, "vendor": "ABC Ltd"},
    )

    call = fake_http_client.calls[-1]
    assert call["path"] == "/v1/intents"
    body = json.loads(call["signed_body"])
    assert body["action"] == "vendor_payment"
    assert body["amount"] == 85000
    assert body["currency"] == "USD"  # defaulted, matching the spec's own example
    assert body["counterparty"] == "ABC Ltd"  # aliased from "vendor"
    assert body["context"]["operation"] == "Approve"
    assert "vendor" not in body["context"]  # consumed as counterparty, not duplicated into context
    assert "amount" not in body["context"]


def test_authorize_signs_the_exact_bytes_sent(credentials_path, fake_http_client):
    agent = _registered_agent(credentials_path, fake_http_client)
    fake_http_client.queue_response(
        {
            "decision": {"outcome": "ALLOW", "decision_id": "d-1", "reason": None, "evaluated_mandates": []},
            "evidence_id": "e-1",
            "status": "RESOLVED",
        }
    )

    agent.authorize(
        principal="Finance Manager",
        operation="Approve",
        resource="Vendor Payment",
        resource_data={"amount": 85000},
    )

    call = fake_http_client.calls[-1]
    signature_b64 = call["headers"]["X-PayReality-Signature"]
    assert call["headers"]["X-PayReality-Key-Id"] == "c-1"

    from payreality import crypto

    public_key_b64 = crypto.public_key_from_private(agent._private_key)
    verify_key = nacl.signing.VerifyKey(base64.b64decode(public_key_b64))
    verify_key.verify(call["signed_body"], base64.b64decode(signature_b64))  # raises if invalid


@pytest.mark.parametrize(
    "outcome,status",
    [("ALLOW", "RESOLVED"), ("DENY", "RESOLVED"), ("HUMAN_REVIEW", "PENDING")],
)
def test_authorize_maps_every_outcome_to_a_decision(credentials_path, fake_http_client, outcome, status):
    agent = _registered_agent(credentials_path, fake_http_client)
    fake_http_client.queue_response(
        {
            "decision": {
                "outcome": outcome,
                "decision_id": "d-1",
                "reason": "some reason",
                "evaluated_mandates": ["m-1"],
            },
            "evidence_id": "e-1",
            "status": status,
        }
    )

    decision = agent.authorize(
        principal="Finance Manager",
        operation="Approve",
        resource="Vendor Payment",
        resource_data={"amount": 100},
    )

    assert decision.outcome == outcome
    assert decision.status == status
    assert decision.evidence_id == "e-1"
    assert decision.evaluated_mandates == ("m-1",)
    assert decision.allowed == (outcome == "ALLOW")
    assert decision.denied == (outcome == "DENY")
    assert decision.requires_human_review == (outcome == "HUMAN_REVIEW")


def test_get_decision_maps_resolution_when_present(credentials_path, fake_http_client):
    agent = _registered_agent(credentials_path, fake_http_client)
    fake_http_client.queue_response(
        {
            "id": "d-1",
            "status": "RESOLVED",
            "outcome": "HUMAN_REVIEW",
            "reason": "escalated",
            "evaluated_mandates": [],
            "resolution": {"resolution": "approved", "resolved_by": "Jane", "reason": "looked fine"},
        }
    )

    decision = agent.get_decision("d-1")

    assert decision.resolution.resolution == "approved"
    assert decision.resolution.resolved_by == "Jane"
