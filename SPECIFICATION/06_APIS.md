# Part 6 — APIs

**Supersedes/synthesizes:** `docs/API_SPECIFICATION.md` (endpoint list without current RBAC/lifecycle detail), `openapi.json` (the machine-readable, always-authoritative source — this table is a human-readable derivative of it). Extracted directly from every `@router.*` decorator in `server/app/routers/*.py`, ~84 endpoints across 11 routers.

## 6.1 Auth legend

| Symbol | Meaning |
|---|---|
| 🔓 | No auth — public read |
| 🔑 | Agent signature (`verify_agent_signature`) |
| 🛡️`<Permission>` | `require_permission(Permission.<X>)` — operator key bypasses, else Role → Permission |
| 👤 | Session-only (`get_current_user`) |
| 🏢 | Resolves acting organisation (`get_current_organization`) |
| ⛔410 | Retired — always returns `410 Gone` |

## 6.2 `intents.py` — prefix `/v1`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/intents` | 🔑 | Submit a signed Intent → runs the full Decision Engine pipeline, returns the Decision |
| GET | `/decisions/{decision_id}` | 🔓 | Fetch one Decision |
| POST | `/decisions/{decision_id}/resolve` | 🛡️`DECISIONS_RESOLVE` | Resolve a `HUMAN_REVIEW` decision (approve/deny), appends a second Evidence record |

## 6.3 `evidence.py` — prefix `/v1/evidence`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/verification-key` | 🔓 | Current Ed25519 public key, for independent offline verification |
| GET | `/verification-keys` | 🔓 | Full signing-key history (active + retired) |
| GET | `/{evidence_id}` | 🔓 | Fetch one Evidence record |
| GET | `` (list) | 🔓 | List Evidence, optional `decision_id` filter |
| POST | `/{evidence_id}/verify` | 🔓 | Re-check one record's signature |
| GET | `/chain/verify` | 🔓 | Verify signature + `previous_hash` continuity for an org-scoped range |

## 6.4 `agents.py` — prefix `/v1/agents`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `` (create) | 🛡️`AGENT_REGISTER` | Register a new Agent + its first Certificate (`issued`, not yet active) |
| GET | `` (list) | 🔓 | Agent Directory: search/filter (status, environment, owner, principal, `q`)/paginate |
| GET | `/{agent_id}` | 🔓 | Agent detail |
| PATCH | `/{agent_id}` | 🛡️`AGENT_MANAGE` | Edit metadata (description, purpose, model, version, runtime, platform, tags, labels) |
| DELETE | `/{agent_id}` | 🛡️`AGENT_RETIRE` | Semantic delete = retire |
| GET | `/{agent_id}/certificates` | 🔓 | Certificate history for an agent |
| GET | `/{agent_id}/audit` | 🔓 | Audit event history |
| POST | `/{agent_id}/audit/{event_id}/verify` | 🔓 | Verify one audit event's signature |
| POST | `/{agent_id}/activate` | 🛡️`AGENT_ACTIVATE` | `registered`/`suspended` → `active` |
| POST | `/{agent_id}/suspend` | 🛡️`AGENT_SUSPEND` | `active` → `suspended` |
| POST | `/{agent_id}/retire` | 🛡️`AGENT_RETIRE` | → `retired` (terminal) |
| POST | `/{agent_id}/revoke` | 🛡️`AGENT_REVOKE` | → `revoked` (terminal, compromise) |
| POST | `/{agent_id}/rotate-certificate` | 🛡️`AGENT_ROTATE` | New Certificate; old → `rotated` |
| POST | `/{agent_id}/transfer-owner` | 🛡️`AGENT_MANAGE` | Change `owner`/`business_unit` |
| POST | `/{agent_id}/heartbeat` | 🔓 (agent self-reports) | Updates `last_seen_at`, version/sdk/runtime |
| POST | `/bulk/suspend`, `/bulk/activate`, `/bulk/retire`, `/bulk/rotate` | 🛡️ matching permission | Bulk lifecycle actions, per-agent independent success/failure |

## 6.5 `runtime_policies.py` — prefix `/v1/runtime-policies`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/vocabulary` | 🔓 | The condition-field vocabulary the manual editor offers |
| GET | `` (list) | 🔓 | List policies, optional `status` filter |
| GET | `/{policy_key}` | 🔓 | Latest version of a policy |
| GET | `/{policy_key}/versions` | 🔓 | All versions |
| GET | `/{policy_key}/versions/{version}` | 🔓 | One specific version |
| POST | `` (create) | 🛡️`RUNTIME_POLICY_CREATE` | New draft (version 1) |
| PUT | `/{policy_key}` | 🛡️`RUNTIME_POLICY_EDIT` | New version of an existing policy_key (never mutates a row) |
| POST | `/{policy_key}/submit-for-review` | 🛡️`RUNTIME_POLICY_EDIT` | `draft` → `pending_review` |
| POST | `/{policy_key}/approve` | 🛡️`AUTHORITY_REVIEW` | `pending_review` → `approved` |
| POST | `/{policy_key}/reject` | 🛡️`AUTHORITY_REVIEW` | `pending_review` → `rejected` |
| POST | `/{policy_key}/compile` | 🛡️`RUNTIME_POLICY_EDIT` | `approved` → `compiled` (runs `compiler_v2`) |
| POST | `/{policy_key}/dry-run` | 🔓 | Simulate a hypothetical Intent against a compiled-but-not-yet-active policy |
| POST | `/{policy_key}/deploy` | 🛡️`RUNTIME_POLICY_PUBLISH` | `compiled` → `active`; recompiles + pushes the **full** active set to OPA |
| GET | `/{policy_key}/diff` | 🔓 | Diff two versions (`from_version`/`to_version`) |

## 6.6 `policies.py` — legacy pipeline, prefix `/v1/policies`

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/documents` | 🔓 | **Active** (read-only) |
| POST | `/documents` (upload) | — | ⛔410 |
| GET | `/authorities` | 🔓 | **Active** (read-only) |
| PATCH | `/authorities/{id}` (review) | 🛡️`AUTHORITY_REVIEW` | ⛔410 |
| POST | `/compile` | 🛡️`RUNTIME_POLICY_EDIT` | ⛔410 |
| POST | `/{policy_id}/activate` | 🛡️`RUNTIME_POLICY_PUBLISH` | ⛔410 |
| GET | `` (list) | 🔓 | **Active** (read-only) |

See [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md) for the full retirement record.

## 6.7 `ai_policy_builder.py` — prefix `/v1/ai-policy-builder`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/status` | 🔓 | Whether a real or fake extraction provider is configured |
| POST | `/upload` | — | Upload a single document, triggers extraction |
| GET | `/uploads` | 🔓 | List uploads |
| GET | `/uploads/{id}` | 🔓 | One upload's status |
| GET | `/uploads/{id}/candidates` | 🔓 | Candidates extracted from one upload |
| GET | `/candidates` | 🔓 | List candidates, filterable |
| GET | `/candidates/{id}` | 🔓 | One candidate |
| PUT | `/candidates/{id}` | 🛡️`AUTHORITY_REVIEW` | Edit a candidate before promoting |
| POST | `/candidates/{id}/dismiss` | 🛡️`AUTHORITY_REVIEW` | Reject a candidate |
| POST | `/candidates/{id}/promote` | 🛡️`AUTHORITY_REVIEW` | Promote to a real draft `RuntimePolicy` |

## 6.8 `ai_authority_builder.py` — prefix `/v1/ai-authority-builder`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/status` | 🔓 | Provider status |
| POST | `/corpora` | 🛡️`AUTHORITY_REVIEW` | Upload multiple documents as one corpus, triggers analysis |
| GET | `/corpora` | 🔓 | List corpora |
| GET | `/corpora/{id}` | 🔓 | One corpus |
| GET | `/corpora/{id}/summary` | 🔓 | Graph summary (counts of principals/resources/operations/relationships/conflicts/gaps) |
| GET | `/corpora/{id}/principals` \| `/resources` \| `/operations` \| `/relationships` \| `/conflicts` \| `/gaps` \| `/questions` | 🔓 | Each discovered entity type, individually listable |
| POST | `/questions/{id}/answer` | 🛡️`AUTHORITY_REVIEW` | Answer a clarification question |

## 6.9 `auth.py` — prefix `/v1/auth`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | 🔓 | Email/password → session token |
| POST | `/logout` | 👤 | Revoke the current session |
| GET | `/me` | 👤 | Current user + their permission list |
| POST | `/setup-owner` | 🔓 (first-run only) | Bootstrap the Owner account when none exists |

## 6.10 `organization.py` — prefix `/v1/organization`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/settings` | 🏢 | Organisation Settings |
| PATCH | `/settings` | 🛡️`ORGANISATION_MANAGE` | Edit settings |
| GET | `/integrations` | 🔓 | Integration status (AI providers, etc.) |
| GET | `/health` | 🔓 | Basic health/status read |
| GET | `/evidence/export` | 🔓 | Bulk Evidence export |
| GET | `/api-keys` | 🛡️`API_KEYS_MANAGE` (view) | List API keys (never returns the raw key) |
| POST | `/api-keys` | 🛡️`API_KEYS_MANAGE` | Issue a new API key (raw key returned once, at creation only) |
| DELETE | `/api-keys/{id}` | 🛡️`API_KEYS_MANAGE` | Revoke a key |

## 6.11 `users.py` — prefix `/v1/users`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `` (list) | 🛡️`USERS_MANAGE` | List org users |
| POST | `` (create) | 🛡️`USERS_MANAGE` | Invite/create a user |
| PATCH | `/{user_id}/role` | 🛡️`USERS_MANAGE` | Change role |
| PATCH | `/{user_id}/status` | 🛡️`USERS_MANAGE` | Enable/disable |

## 6.12 `principals.py` — prefix `/v1/principals`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `` (create) | 🔓 | Create a Principal |
| GET | `` (list) | 🔓 | List Principals |

## 6.13 API design conventions

- **Every mutating endpoint's auth is a `Permission`, never a `Role` check** — the router layer never asks "is this an Owner"; it asks `require_permission(Permission.X)`, and `has_permission` resolves that against whichever role the caller's token maps to. This is Phase 10's central invariant, enforced structurally rather than by convention (see [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md)).
- **Reads are open by default** — no endpoint in this API requires auth purely to `GET` something, reflecting the single-tenant-per-deployment scope (§1.2, §2.6). This is a scope boundary to revisit before multi-tenancy, not an oversight.
- **`POST .../dry-run` and `GET .../diff` are the two genuinely side-effect-free "what if" endpoints** in the whole API — both are deliberately unauthenticated reads-with-simulation, not because the data is unimportant but because they mutate nothing.
- **Every lifecycle-transition endpoint takes an optional `reason`/`actor`** and returns the full updated resource, never a bare `204` — this is what lets the frontend re-render the Agent Detail page's lifecycle timeline immediately from the response, without a second round-trip.
- **`compile` and `deploy` are separate steps everywhere they appear** (both the legacy pipeline's now-410'd endpoints and the current `runtime_policies.py`) — compiling produces and hashes a bundle without making it live; deploying is the only action that ever writes to OPA. This separation is what makes `dry_run_policy` possible: it can simulate against a compiled-but-undeployed bundle.
