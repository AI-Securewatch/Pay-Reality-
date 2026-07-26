# Agent Lifecycle

## What this phase is

Phase 9 makes an Agent a full enterprise identity with a lifecycle, the same way an enterprise manages a human workforce identity: provisioned, activated, suspended, rotated, retired, or revoked, with every transition producing a signed, immutable audit record. Nothing about Runtime Policies, Compiler V2, the Decision Engine, Evidence, Policy Studio, the AI builders, or the SDK's existing `authorize()` contract changed to make this possible; this phase extends the existing `Agent`/`Certificate` tables (`server/app/db/models.py`, already present since Phase 1) rather than replacing them.

## The state machine

```
Registered -> Active -> Suspended -> Active -> Retired
                                            \-> Revoked
Registered -----------------------------------> Retired
Registered -----------------------------------> Revoked
```

| State | Meaning | Can sign Intents? |
|---|---|---|
| `registered` | Exists, not yet operational. | No. |
| `active` | Fully operational. | Yes. |
| `suspended` | Temporary lock. | No, but reviewable. |
| `revoked` | Certificate permanently revoked. Terminal. | No, ever. |
| `retired` | Permanently removed from operational use. Terminal. | No, ever. |

The allowed-transitions table lives as a plain dict in `server/app/services/agent_service.py::_ALLOWED_TRANSITIONS`, not a state-machine library: five states and a handful of edges doesn't earn the dependency. `revoke` is intentionally reachable from `registered`, `active`, or `suspended` (a compromised key doesn't wait for the agent to be active first); `retire` the same.

## A deliberate behavior change: registration no longer means active

Before this phase, `create_agent()` created an Agent as `active` with an immediately `active` Certificate (Phase 1's comment: "no separate certificate issuance step"). As of this phase, a newly created Agent starts `registered` with its Certificate `issued` (not yet `active`); a separate `POST /agents/{id}/activate` call is required before it can sign Intents. This mirrors how a real enterprise identity system works: an account is provisioned, then a separate step enables it.

This is a real, deliberate break from Phase 1's behavior, not an oversight. Existing agents already in the database (created before this migration, all `active` with an `active` certificate) are completely unaffected: the migration only adds columns and widens CHECK constraints, it never touches existing row values. Only agents created from now on start in `registered`.

The Python SDK's `agent.register()` chains an automatic `activate()` call so it still returns a ready-to-use identity in one call, preserving Phase 8's "install and start using in under 5 minutes" promise (see SDK_AGENT_GUIDE.md's design-decisions section for why this was the right call rather than a breaking change to `register()`'s contract). The raw HTTP API and the Authority page in the frontend do not auto-activate: registering an agent there leaves it in `registered` until an operator explicitly activates it, which is the more realistic enterprise workflow (and lets an approval gate sit between the two steps, if a future phase wants one).

## Runtime behavior: what the Decision Engine does with each state

`server/app/services/intent_service.py::submit_intent` now checks agent status in two different ways, and this is deliberate, not inconsistent:

- **`revoked` and `retired`**: rejected before an Intent row is even inserted (`AgentRevokedError` / `AgentRetiredError`, HTTP 403). No Decision, no Evidence. These are terminal states with no standing to act at all.
- **`suspended`**: an Intent row *is* inserted, then short-circuited to a `HUMAN_REVIEW` Decision with `reason="AGENT_SUSPENDED"` (the spec's literal required value) and a normal, signed Evidence record. OPA is never queried. Suspension is temporary and reviewable, so what was attempted while suspended is preserved, not silently dropped.
- **`registered`**: also rejected pre-insert (`AgentNotOperationalError`), though in practice this path is unreachable via real HTTP traffic: `verify_agent_signature` (`server/app/dependencies.py`) only accepts a Certificate with `status == "active"`, and a `registered` agent's only certificate is `issued`. The explicit check in `submit_intent` is defense in depth for any direct, non-HTTP caller, not a path real traffic reaches.

Both approaches satisfy "do not evaluate Runtime Policies, return immediately" from the same underlying rule; they differ only in whether an evidentiary trail is worth keeping for what was attempted.

## The audit trail: a new table, not a repurposed one

Every lifecycle transition (`agent_created`, `agent_activated`, `agent_suspended`, `agent_reactivated`, `agent_revoked`, `agent_retired`, `certificate_rotated`, `certificate_rotation_requested`, `owner_changed`) becomes one row in a new `agent_audit_events` table (`server/app/db/models.py::AgentAuditEvent`), signed with the exact same canonicalize-then-ED25519-sign primitives Decision Evidence already uses (`domain/evidence/signing.py::sign_payload`, reused unchanged). Verify it independently via `POST /agents/{id}/audit/{event_id}/verify`, the same pattern as `POST /evidence/{id}/verify`.

This is a new table, not `evidence.decision_id` relaxed to nullable. Two reasons: first, Evidence is specifically the record of an Intent's evaluation, and widening its one clear invariant (every row ties to exactly one Decision) to serve a second, unrelated purpose would have made the Evidence table itself harder to reason about. Second, the Agent Detail Page's own spec already lists "Decision History", "Evidence", and "Audit" as three separate sections, meaning the spec itself treats these as related but distinct concepts, not one.

**Heartbeats do not produce an audit event.** At the stated "10,000+ agents" scale, a heartbeat every few minutes from every agent would flood this ledger for no auditing value. A heartbeat only updates `Agent.last_seen_at` (and whichever of `version`/`sdk_version`/`runtime` were supplied); see AGENT_DIRECTORY.md for how that becomes a Healthy/Warning/Offline reading.

## Two additions beyond the spec's literal API list

1. **`POST /agents/{id}/revoke`**. Not named in the spec's own API list (only suspend/activate/retire/rotate/heartbeat/transfer are), but `Revoked` is a required terminal state in the same spec's state-machine section. Without this endpoint it would be permanently unreachable, so it was added and is called out here rather than left as a silently missing capability.
2. **`DELETE /agents/{id}` retires, it does not delete.** The spec's own API list names `DELETE` alongside `GET`/`POST`/`PATCH`, but the same spec's design philosophy states plainly: "Nothing is deleted. Everything is auditable." A literal hard delete would contradict that on the same page it's requested. `DELETE` is implemented as an alias for `retire()` (the same effect a human-identity system's "deactivate account" action has), not silently ignored or turned into a true delete.

## Ownership vs. Principal

`owner`/`business_unit`/`environment`/`tags` (Agent Ownership) are separate from `acting_for_principal_id` (Principal, unchanged from Phase 1: who the agent's signed Intents act on behalf of for policy evaluation). The spec's own examples for Owner ("Finance Team", "Risk Team", "Treasury") read as organizational/team labels, not Principal names (which are role/individual names like "Finance Manager"). `POST /agents/{id}/transfer` changes `owner`/`business_unit` only; it does not reassign `acting_for_principal_id`, which would be a much larger change (re-provisioning which Principal's authority the agent acts under) that nothing in this phase's spec actually asked for.

`tags` and `labels` are two separate JSONB string-array columns, matching the spec naming both under different headings (Ownership vs. Metadata) rather than treating them as the same idea twice.

## Testing: what's verified and how

The state machine (`_ALLOWED_TRANSITIONS`) and health computation (`compute_health`) are pure functions with no DB dependency and are unit-tested directly (`server/tests/unit/test_agent_lifecycle.py`). The three pre-insert rejections in `submit_intent` (revoked/retired/registered) are also pure guard clauses that run before `db` is ever touched, and are tested the same way, passing `db=None` (`server/tests/unit/test_intent_service_agent_gates.py`).

The rest of `agent_service.py` (create/activate/suspend/retire/revoke/rotate/transfer/heartbeat, all of which call `db.get`/`db.add`/`db.commit`) has no local Postgres available to test against in this environment, and this codebase has never had DB-integration tests for any service layer (confirmed: no `conftest.py`, no test file touches a real database anywhere in `server/tests/unit/`). This is stated plainly rather than assumed correct: that half is verified by code review against the exact same invariants asserted in the pure-logic tests.

**Live verification against production, after deploy:** the migration was confirmed to apply cleanly (no crash loop; `GET /health` and every new route respond), and pre-existing agents came through unchanged (`status: "active"`, `certificate_status: "active"`, exactly as the migration was designed to leave them). `GET /agents/{id}` was checked end to end against a real, pre-existing production agent: principal name resolved correctly, its linked Runtime Policy matched by principal name, its certificate history, decision history, and Evidence all returned correctly. `GET /agents/{id}/audit` on that same (pre-Phase-9) agent correctly returned an empty list rather than erroring, since it has no lifecycle events from before this phase shipped. Read-only endpoints only: no mutating lifecycle action (activate/suspend/retire/revoke/rotate/transfer/heartbeat/bulk) was exercised against a real production agent, to avoid changing the state of real data during verification.
