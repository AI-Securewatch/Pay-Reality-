# Part 4 — Backend

**Supersedes/synthesizes:** `ARCHITECTURE.md` (backend section), `COMPILER_V2_ARCHITECTURE.md`, `AUTHORING_ARCHITECTURE.md`, `RUNTIME_POLICY_LANGUAGE.md`. Full current module inventory below is derived directly from `server/app/` (74 Python files), not from any prior document's file list.

## 4.1 Stack

FastAPI (ASGI), SQLAlchemy 2.x ORM, Alembic migrations, PostgreSQL, Open Policy Agent (external process, HTTP), PyNaCl (Ed25519 signing), Pydantic v2 (schemas). No task queue, no cache layer, no background worker process — every request is synchronous, request-scoped, and talks to Postgres/OPA directly. See [16_CURRENT_LIMITATIONS.md](16_CURRENT_LIMITATIONS.md) for where that stops scaling.

## 4.2 Top-level module map

```
server/app/
├── main.py                 FastAPI app construction, router mounting, middleware registration
├── config.py                Settings (env-driven), see §4.6
├── security.py               verify_operator_key, observability_middleware (rate limit + logging + headers)
├── dependencies.py            verify_agent_signature, require_permission, get_current_user, get_current_organization
├── logging_config.py          Structured logging setup
├── opa_client.py               HttpOpaClient: upload_policy/upload_data/query against OPA's HTTP API
├── db/
│   ├── models.py                Every SQLAlchemy ORM model (33 tables) — see 05_DATABASE.md
│   └── session.py                Engine/session factory, get_db() dependency
├── domain/                     Business logic, minimal I/O — see §4.3
├── services/                   Orchestration layer — see §4.4
├── routers/                     HTTP surface — see §4.5 and 06_APIS.md
└── schemas/                    Pydantic request/response models, one file per feature area
```

## 4.3 `domain/` — business logic

| Package | Files | Purpose | Status |
|---|---|---|---|
| `domain/decision/` | `engine.py`, `scope_vocabulary.py` | The Decision Engine (`evaluate()`) and `KNOWN_SCOPES` fixed vocabulary | **Active** |
| `domain/evidence/` | `signing.py` | `canonicalize`, `sign_payload`, `verify_payload`, `payload_hash` — Ed25519 signing primitives shared by Evidence and Agent audit events | **Active** |
| `domain/auth/` | `signature.py` | Request-signature verification for Agent-signed Intents | **Active** |
| `domain/rbac/` | `permissions.py` | `Role`, `Permission` enums and the `ROLE_PERMISSIONS` mapping (Phase 10) | **Active** |
| `domain/compiler_v2/` | `compiler_v2.py`, `rego_generator.py`, `bundle_builder.py`, `scope_overlap.py`, `dry_run.py`, `compiler_errors.py` | Compiles a `RuntimePolicy` into a Rego bundle; conflict detection; dry-run simulation | **Active** — the sole OPA writer |
| `domain/runtime_policy/` | `runtime_policy.py`, `schema.py`, `conditions.py`, `constraints.py`, `effects.py`, `metadata.py`, `validators.py` | The `RuntimePolicy` domain model itself: scope, conditions, effects, constraints, validation | **Active** |
| `domain/ai_authority_builder/` | `provider.py`, `claude_provider.py`, `fake_provider.py` | Extraction provider interface for the multi-document Authority Builder | **Active** (Claude) / **Partial** (fake fallback used where no key configured) |
| `domain/ai_policy_builder/` | `provider.py`, `claude_provider.py`, `fake_provider.py`, `text_extraction.py` | Same pattern for the single-document Policy Builder | **Active** / **Partial** |
| `domain/extraction/` | `provider.py`, `claude_provider.py`, `fake_provider.py` | The original (legacy) document-extraction provider interface, used by the retired Authority/Mandate pipeline | **Dead** — see [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md) |
| `domain/time_utils.py` | — | `to_utc_iso`, relocated here when the legacy `compiler.py` that originally held it was deleted | **Active** (small shared utility) |

Note `domain/compiler/` (the legacy Rego template compiler) no longer exists — it was deleted in full this cycle; see [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md) for the removal record.

## 4.4 `services/` — orchestration layer

| File | Owns |
|---|---|
| `agent_service.py` | Agent lifecycle state machine (register/activate/suspend/retire/revoke/rotate), certificates, audit events, heartbeat, bulk transitions, health computation |
| `authority_context_service.py` | Runtime Authority Context resolution (`resolve_runtime_authority_context`), risk classification |
| `intent_service.py` | `submit_intent`: the full Intent → Decision → Evidence pipeline, chain-scope/previous-hash resolution |
| `evidence_service.py` | Evidence read/verify, `verify_chain` (Phase 5) |
| `signing_key_service.py` | The signing-key registry (Phase: Evidence Key Rotation) — `key_id -> public_key` lookups across rotations |
| `resolution_service.py` | Resolving a `HUMAN_REVIEW` decision (approve/deny), appending the resolution's own Evidence record |
| `runtime_policy_service.py` | RuntimePolicy CRUD + lifecycle (draft → pending_review → approved → compiled → active), `deploy_policy`'s full-active-set recompile |
| `ai_authority_builder_service.py` | Corpus upload/review/promote-to-draft workflow |
| `ai_policy_builder_service.py` | Single-document upload/review/promote-to-draft workflow |
| `auth_service.py` | Login, session/API-key token resolution, `resolve_role_for_token`, `resolve_organization_id_for_token` |
| `organization_service.py` | Organisation Settings CRUD, bootstrap |
| `policy_service.py` | **Trimmed to `list_policies` only** — the legacy pipeline's write functions were deleted (§4.3) |
| `document_service.py` | **Trimmed to `list_documents` only** — same |
| `review_service.py` | **Trimmed to `list_authorities_for_review` only** — same |

## 4.5 `routers/` — HTTP surface (12 router modules, ~90 endpoints)

| Router | Mounted prefix | Covers |
|---|---|---|
| `intents.py` | `/v1/intents` | Intent submission (Ed25519-signed) |
| `evidence.py` | `/v1/evidence` | Evidence read, verify, chain verify, verification keys |
| `agents.py` | `/v1/agents`, `/v1/principals`-adjacent | Agent Directory, lifecycle actions, certificates, audit events |
| `principals.py` | `/v1/principals` | Principal CRUD |
| `runtime_policies.py` | `/v1/runtime-policies` | RuntimePolicy CRUD + lifecycle transitions |
| `policies.py` | `/v1/policies` | Legacy pipeline — 3 read-only endpoints remain live, all writes `410` |
| `ai_authority_builder.py` | `/v1/ai-authority-builder` | Corpus upload/review/promote |
| `ai_policy_builder.py` | `/v1/ai-policy-builder` | Document upload/review/promote |
| `auth.py` | `/v1/auth` | Login, logout, me, owner setup |
| `organization.py` | `/v1/organization` | Organisation Settings |
| `users.py` | `/v1/users` | User/role management |

Full endpoint-by-endpoint tables are in [06_APIS.md](06_APIS.md).

## 4.6 Configuration (`config.py`)

Environment-driven `Settings` (Pydantic `BaseSettings`). Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Render-internal in production) |
| `OPA_URL` | Base URL of the OPA HTTP API |
| `ADMIN_API_KEY` | The shared operator key (`verify_operator_key`/`require_permission`'s bypass) |
| `ANTHROPIC_API_KEY` | Enables the real Claude extraction providers; absent → fake/deterministic providers |
| `EVIDENCE_SIGNING_KEY_B64` | Current Ed25519 signing key (base64) |
| `EVIDENCE_SIGNING_KEY_ID` | The `key_id` tag for records signed under the current key |
| `INTENT_SIGNATURE_WINDOW_SECONDS` | Replay-window tolerance for Agent-signed Intents |
| `CORS_ORIGIN` | Single allowed frontend origin (never a wildcard) |
| `ENVIRONMENT` | Gates `Strict-Transport-Security` header emission |
| `SESSION_TOKEN_TTL_SECONDS` (Phase 10) | Session token lifetime |
| ~2 more | Rate-limit window/threshold constants, log level |

## 4.7 Dependency-injection points (`dependencies.py`)

The four FastAPI dependency functions every mutating/authenticated route composes from — see [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) §2.6 and [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md) for full behavior:

- `verify_agent_signature` → resolves and returns the calling `Agent`.
- `require_permission(permission)` → operator key bypass, else bearer-token → Role → permission check.
- `get_current_user` → session-token-only, returns the `User` (routes that need identity, not just permission).
- `get_current_organization` → resolves "which Organisation is this request acting for" (operator key → the one bootstrapped org; token → its own org).

## 4.8 Backend testing

`server/tests/unit/` — 19 test files, no DB-backed fixtures anywhere (confirmed directly; every DB-dependent code path in this repository is instead verified live against the real production database, not via isolated test fixtures). Pure-function coverage: signing/canonicalization, Rego generation, scope-overlap conflict detection, RuntimePolicy validators, RBAC permission mapping, decision-engine evaluation logic given a mocked OPA response, authority-context risk classification. 166 tests passing as of this specification's writing.

## 4.9 What's active vs. dead, backend module summary

See [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md) for the full reconciliation; in one line: everything in §4.3/§4.4/§4.5 above is **active** except `domain/extraction/` (dead, superseded by the two newer `ai_*_builder` extraction packages) and the trimmed remainders of `policy_service.py`/`document_service.py`/`review_service.py` (their surviving functions are active reads; their deleted functions are gone, not merely dormant).
