"""Phase 9 (AGENT_LIFECYCLE.md "Runtime Behaviour"): revoked/retired/
registered agents must be rejected before policy evaluation, and before
even an Intent row is written. All three checks are the very first
lines of submit_intent, before `db` is touched at all -- so passing
`db=None` here is a legitimate way to test the guard clause in isolation
without a database, not a shortcut around a real dependency."""

import uuid
from datetime import datetime, timezone

import pytest

from app.db.models import Agent
from app.services.intent_service import (
    AgentNotOperationalError,
    AgentRetiredError,
    AgentRevokedError,
    submit_intent,
)

_COMMON_KWARGS = dict(
    action="vendor_payment",
    amount=100.0,
    currency="USD",
    counterparty=None,
    context={},
    requested_at=datetime.now(timezone.utc),
    nonce="test-nonce",
    correlation_id=None,
)


def _agent(status: str) -> Agent:
    return Agent(id=uuid.uuid4(), name="test", acting_for_principal_id=uuid.uuid4(), status=status)


def test_revoked_agent_is_rejected_before_any_db_access():
    with pytest.raises(AgentRevokedError):
        submit_intent(None, agent=_agent("revoked"), **_COMMON_KWARGS)


def test_retired_agent_is_rejected_before_any_db_access():
    with pytest.raises(AgentRetiredError):
        submit_intent(None, agent=_agent("retired"), **_COMMON_KWARGS)


def test_registered_agent_is_rejected_before_any_db_access():
    with pytest.raises(AgentNotOperationalError):
        submit_intent(None, agent=_agent("registered"), **_COMMON_KWARGS)
