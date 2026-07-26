"""Phase 9 (AGENT_LIFECYCLE.md): the state machine and health computation
are pure logic with no DB dependency, so they're tested directly here,
the same way this codebase already tests decision_engine/compiler_v2/
signing without a database. The DB-touching half of agent_service.py
(create/activate/suspend/... which all call db.get/db.add/db.commit) has
no local Postgres available to test against in this environment; that
half is verified by code review against the exact same invariants
asserted here, plus live verification against the deployed API (see
AGENT_LIFECYCLE.md's testing section for the honest split, matching
SDK_ARCHITECTURE.md's precedent for the same kind of disclosure)."""

from datetime import datetime, timedelta, timezone

from app.services.agent_service import _ALLOWED_TRANSITIONS, compute_health
from app.db.models import Agent


def test_registered_can_activate_revoke_or_retire_but_not_suspend():
    assert _ALLOWED_TRANSITIONS["registered"] == {"active", "revoked", "retired"}


def test_active_can_suspend_revoke_or_retire():
    assert _ALLOWED_TRANSITIONS["active"] == {"suspended", "revoked", "retired"}


def test_suspended_can_reactivate_revoke_or_retire():
    assert _ALLOWED_TRANSITIONS["suspended"] == {"active", "revoked", "retired"}


def test_revoked_and_retired_are_terminal():
    assert _ALLOWED_TRANSITIONS["revoked"] == set()
    assert _ALLOWED_TRANSITIONS["retired"] == set()


def test_every_reachable_state_is_a_key():
    # Guards against a typo silently making a real status value fall
    # through to `.get(status, set())` -> treated as terminal.
    assert set(_ALLOWED_TRANSITIONS.keys()) == {
        "registered", "active", "suspended", "revoked", "retired"
    }


def _agent(status: str, last_seen_at=None) -> Agent:
    agent = Agent(
        name="test", acting_for_principal_id=None, status=status, last_seen_at=last_seen_at
    )
    return agent


def test_health_is_unknown_for_non_operational_statuses():
    for status in ("registered", "revoked", "retired"):
        assert compute_health(_agent(status)) == "unknown"


def test_health_is_offline_when_never_seen():
    assert compute_health(_agent("active", last_seen_at=None)) == "offline"


def test_health_is_healthy_within_five_minutes():
    now = datetime.now(timezone.utc)
    agent = _agent("active", last_seen_at=now - timedelta(minutes=2))
    assert compute_health(agent, now=now) == "healthy"


def test_health_is_warning_between_five_and_thirty_minutes():
    now = datetime.now(timezone.utc)
    agent = _agent("active", last_seen_at=now - timedelta(minutes=15))
    assert compute_health(agent, now=now) == "warning"


def test_health_is_offline_beyond_thirty_minutes():
    now = datetime.now(timezone.utc)
    agent = _agent("active", last_seen_at=now - timedelta(hours=2))
    assert compute_health(agent, now=now) == "offline"


def test_suspended_agent_can_still_report_healthy():
    # A suspended agent can't sign Intents but is still expected to
    # heartbeat (see agent_service.record_heartbeat's docstring).
    now = datetime.now(timezone.utc)
    agent = _agent("suspended", last_seen_at=now - timedelta(minutes=1))
    assert compute_health(agent, now=now) == "healthy"
