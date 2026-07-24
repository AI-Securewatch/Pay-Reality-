# PayReality API Specification

Base path for everything below: `/v1` (except `/health` and `/health/ready`, which are unversioned by convention). The machine-readable schema is exported to [`openapi.json`](openapi.json); regenerate it after any router change with:

```
cd server && python -c "import json; from app.main import app; json.dump(app.openapi(), open('../docs/openapi.json','w'), indent=2)"
```

FastAPI also serves this live at `/docs` (Swagger UI) and `/openapi.json` on any running instance.

## Auth model

Three distinct auth mechanisms exist, none of them a human login system yet (see [SECURITY.md](../SECURITY.md)):

| Mechanism | Header(s) | Used by |
|---|---|---|
| **Agent signature** | `X-PayReality-Key-Id`, `X-PayReality-Signature` | `POST /v1/intents` only. The Agent signs the raw request body with its Certificate's private key; the server verifies against the matching public key on file and checks the request timestamp falls within `INTENT_SIGNATURE_WINDOW_SECONDS`. |
| **Operator key** | `X-PayReality-Operator-Key` | Every endpoint that creates a Principal/Agent, reviews/compiles/activates a Policy, or resolves a `HUMAN_REVIEW` decision. A single shared secret (`ADMIN_API_KEY`), checked with a constant-time comparison. Stands in for a real per-user RBAC system that doesn't exist yet. |
| **None** | None | Every `GET` endpoint, plus `POST /v1/evidence/{id}/verify` and `GET /v1/evidence/verification-key`. Read access and evidence verification are intentionally open; see SECURITY.md for why that's currently correct rather than an oversight. |

## Endpoints

### Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Liveness only: no dependency calls. Always 200 if the process is up. |
| GET | `/health/ready` | none | Readiness: live-checks Postgres (`SELECT 1`, 5s connect timeout) and OPA (`GET /health`). Returns 503 if either is down. Use this for load-balancer/orchestrator health checks, not `/health`. |

### Principals: `POST/GET /v1/principals`

A Principal is the entity an Agent acts *for* (a company, a department). `POST` (operator key required) is a Phase 1 convenience; in the intended flow a Principal is created implicitly when a delegation-of-authority document is onboarded, not via a direct API call.

### Agents: `POST/GET /v1/agents`

An Agent is a certificate-holding AI identity. `POST` (operator key required) registers one against an existing Principal, taking its public key (the private key is generated and kept client-side; see ARCHITECTURE.md). `GET` lists all agents with their active certificate.

### Policy pipeline: `/v1/policies/*`

The document -> authority -> compiled policy -> active policy lifecycle:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/documents` | none | List uploaded delegation-of-authority documents. |
| POST | `/documents` | operator key | Upload a PDF; extraction (Claude-backed if `ANTHROPIC_API_KEY` is set, deterministic fallback otherwise) runs synchronously in this request. |
| GET | `/authorities` | none | List extracted Authorities pending/approved/rejected, filterable by document or status. |
| PATCH | `/authorities/{id}` | operator key | Approve (optionally editing the extracted limit/currency/conditions) or reject an Authority. Original extracted values are retained separately even after an edit. |
| POST | `/{document_id}/compile` | operator key | Compile all approved Authorities for a document into a new draft Policy version + its Mandates. |
| POST | `/{policy_id}/activate` | operator key | Activate a compiled Policy (retiring whichever was previously active) and push its bundle to OPA. Also how a rollback works: reactivate a previously-retired version's id. |
| GET | `` | none | List all Policy versions and their status. |

### Runtime Decisions: `/v1/intents`, `/v1/decisions/*`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/intents` | agent signature | Submit an Intent. Runs it through the Decision Engine (OPA) and returns the outcome (`ALLOW`/`DENY`/`HUMAN_REVIEW`) plus the Evidence id created for it. Rejects with `403 agent_revoked` or `409 replay_detected` as appropriate. |
| GET | `/decisions/{id}` | none | Poll a Decision's current status: `PENDING` until a `HUMAN_REVIEW` outcome is resolved, `RESOLVED` otherwise. |
| POST | `/decisions/{id}/resolve` | operator key | Resolve a `HUMAN_REVIEW` decision as `approved` or `denied`. Appends a new Evidence record rather than mutating the original Decision. `409`s if already resolved or if the Decision isn't in `HUMAN_REVIEW`. |

### Evidence: `/v1/evidence/*`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/verification-key` | none | The current ED25519 public key, so any third party can verify a signature without trusting this server's own `/verify` result. |
| GET | `/{id}` | none | Fetch a single Evidence record (full payload, signature, key id, status). |
| GET | `` | none | List Evidence, optionally filtered by `decision_id`. |
| POST | `/{id}/verify` | none | Re-verify a signature server-side. A `false` result is a P1 signal (tampering or corruption), not a routine negative; see SECURITY.md. |

## Error shape

All 4xx/5xx responses are `{"detail": ...}`: either a string error code (e.g. `"agent_revoked"`, `"replay_detected"`, `"invalid_operator_key"`) or, for `422` validation errors, FastAPI's standard field-level error list. Unhandled exceptions never leak a stack trace: they're caught by `app.security.observability_middleware` and returned as a bare `{"detail": "internal_error"}` with a `500`, with the real exception logged server-side against the same `X-Request-ID` returned in the response headers.

## Versioning

`/v1` is the only version that exists. There's no deprecation policy yet because there's been no `/v2` to deprecate against; when one is needed, the plan is additive versioning at the router prefix (`/v2/...`) with `/v1` kept live until every caller has migrated, not in-place breaking changes to `/v1`.
