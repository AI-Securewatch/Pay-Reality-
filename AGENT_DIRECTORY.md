# Agent Directory

## What replaced what

The old Authority page (`src/app/live/pages/LiveAgents.tsx`, deleted this phase) was a flat register-and-list view: no search, no filter, no pagination, no lifecycle actions beyond creation. It's replaced by two pages, still mounted at the same nav item (`/authority`, no new top-level nav entry, consistent with this platform's established "consolidate, don't sprawl" navigation approach):

- **`src/app/agents/AgentDirectoryPage.tsx`** (`/authority`): registration, search/filter, the agent table, and bulk operations.
- **`src/app/agents/AgentDetailPage.tsx`** (`/authority/:agentId`): identity, principal, linked Runtime Policies, certificate history, decision history, evidence, the signed audit/lifecycle timeline, heartbeat/SDK info, and every single-agent lifecycle action.

## Directory columns and controls

| Column | Source |
|---|---|
| Name | `Agent.name`, links to the Detail page |
| Principal | Resolved client-side from `GET /v1/principals`, joined by `acting_for_principal_id` (no principal name field exists on the Agent response itself) |
| Owner | `Agent.owner` |
| Environment | `Agent.environment` |
| Status | `AgentStatusBadge`, one of the five lifecycle states |
| Certificate | The active certificate's status (`issued`/`active`/etc.), or "none" |
| Last seen | `HealthDot` (see below), not a raw timestamp, because at a glance "is this thing alive" matters more than the exact second |
| Actions | A single contextual action per row (Activate for `registered`/`suspended`, Suspend for `active`; anything more sits on the Detail page, not crowded into a table row) |

Search (`q`, matched against name), status filter, and environment filter are all server-side query parameters on `GET /v1/agents`, not client-side array filtering, so they still work correctly once a deployment has more agents than a single page holds.

## Pagination: a real requirement, not decoration

The spec's own success criterion is managing "10,000+ AI agents... exactly as they manage human workforce identities." That number only means something if the list endpoint doesn't hand back all 10,000 rows on every page load. `GET /v1/agents` now returns `{agents, total, limit, offset}` instead of a bare array, `limit` capped at 500 server-side regardless of what's requested, and the Directory page paginates in pages of 25 with Previous/Next controls driven by `total`.

This response-shape change had a real ripple effect worth naming rather than hiding: three other pages (`PlatformOverview.tsx`, `LiveAssurance.tsx`, `LiveTestIntent.tsx`) called the old bare-array `GET /v1/agents` directly and were updated to unwrap the new envelope. `LiveAssurance.tsx`'s "Active agents" rollup in particular was changed to read two `total` values (`?limit=1` and `?status=active&limit=1`) instead of filtering a single potentially-truncated page client-side, so that number stays accurate regardless of how many agents actually exist.

## Health: Healthy / Warning / Offline

Computed by `agent_service.compute_health()` (`server/app/services/agent_service.py`) from `Agent.last_seen_at`, updated only by `agent.heartbeat()`:

- **Healthy**: seen within the last 5 minutes.
- **Warning**: seen within the last 30 minutes.
- **Offline**: longer than that, or never seen at all.
- **Unknown** (shown as "Not applicable" in the UI): the agent isn't `active` or `suspended` (i.e. it's `registered`, `revoked`, or `retired`) and was never expected to be heartbeating in the first place.

These thresholds are a deliberate default, not something the spec itself defines, the same kind of judgment call `intent_service.py::_classify_risk`'s risk-amount bands already made for a different field. A `suspended` agent can still report Healthy: suspension blocks signing Intents, not heartbeating, since an operator reviewing a suspended agent may still want to know it's alive and waiting.

## Bulk operations

Row checkboxes plus a toolbar that appears once at least one row is selected: Activate many, Suspend many, Retire many, Request rotation (see CERTIFICATE_ROTATION.md for why bulk rotation can only ever request rotation, never perform it directly). Each bulk call (`POST /agents/bulk/{suspend,activate,retire,rotate}`) processes every selected agent independently server-side (`agent_service.bulk_transition`): one agent already in an invalid state for the requested transition doesn't abort the other 999, and the response reports a per-agent success/failure list plus aggregate `succeeded`/`failed` counts.

**Known scaling limit, stated plainly:** `bulk_transition` is still N sequential transactions today, not one set-based `UPDATE`. This is fine for the batch sizes an operator actually selects by hand from a Directory page (tens to low hundreds of rows), not a substitute for a real bulk-data migration tool if a future need arises to transition literally all 10,000+ agents in one operation. No silent cap hides this: if that scale of bulk operation becomes a real requirement, `bulk_transition`'s current implementation is the place that needs to change, not something to route around.

## Agent Detail Page sections

Identity (name, owner, business unit, environment, tags, description, purpose, model, version, runtime, platform), Principal, Runtime Policies (matched by the agent's Principal name against `RuntimePolicyRecord.content.scope.principal`, since there is no direct agent-to-policy foreign key, consistent with this codebase's plain-FK, no-ORM-relationship style), Certificates (full history, not just the active one), Decision History (last 20), Evidence (last 20), the signed Lifecycle Timeline with a per-event Verify action, Heartbeat/SDK info, and the single-agent lifecycle action buttons (Activate/Suspend/Rotate/Retire/Revoke/Transfer ownership), each contextually shown only when the agent's current status makes that action valid.
