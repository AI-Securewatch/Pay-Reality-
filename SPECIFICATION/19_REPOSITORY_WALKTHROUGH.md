# Part 19 — Repository Walkthrough

**Supersedes/synthesizes:** nothing prior attempts a full folder-by-folder walkthrough. This part is a map, not a re-explanation — every entry cross-references the part that covers it in depth rather than repeating that content.

## 19.1 Top-level layout

```
payreality-demo-audit/
├── server/              FastAPI backend — see §19.2
├── src/                 React frontend — see §19.3
├── sdk-python/           Python SDK — see §19.4
├── SPECIFICATION/         This document
├── docs/                 API_SPECIFICATION.md + machine-readable openapi.json
├── scripts/              smoke_test.py — end-to-end pipeline check against any live instance
├── guidelines/            Guidelines.md — coding/design conventions for this repo
├── audit/                Working notes from prior audit/review passes (not part of the shipped product)
├── *.md (63 files)        Design-time documents — see 00_INDEX.md §"Relationship to existing documents"
├── docker-compose.yml     Postgres + OPA + API, local dev topology
├── render.yaml            Render Blueprint — the actual production hosting definition
├── vercel.json            Frontend hosting config
├── package.json / pnpm-workspace.yaml / vite.config.ts / postcss.config.mjs   Frontend tooling
└── index.html             Frontend entry HTML
```

## 19.2 `server/` — backend

```
server/
├── app/                  See 04_BACKEND.md §4.2 for the full module map (74 files)
│   ├── main.py, config.py, security.py, dependencies.py, logging_config.py, opa_client.py
│   ├── db/                models.py (33 tables, 05_DATABASE.md), session.py
│   ├── domain/             12 packages — decision, evidence, auth, rbac, compiler_v2, runtime_policy,
│   │                       ai_authority_builder, ai_policy_builder, extraction (dead), time_utils
│   ├── services/            14 modules — one per feature area, see 04_BACKEND.md §4.4
│   ├── routers/             11 modules, ~84 endpoints — see 06_APIS.md
│   └── schemas/             10 modules — one Pydantic schema file per feature area
├── alembic/
│   ├── env.py, script.py.mako
│   └── versions/           14 migrations — see 05_DATABASE.md §5.3 for the full chronological list
├── tests/
│   ├── unit/                18 files — pure-function coverage, no DB fixtures anywhere (see 04_BACKEND.md §4.8)
│   └── integration/          conftest.py + test_compiler_v2_opa.py — the one test suite that talks to a
│                             real (test-instance) OPA, proving a compiled bundle round-trips through the
│                             unmodified Decision Engine
├── Dockerfile               Production container build
├── pyproject.toml           Dependencies — see 18_DEPENDENCY_GRAPH.md §18.1
└── .env.example              Documents every required environment variable
```

**Unit test inventory**, by what it verifies (all pure-function, no DB): `test_agent_lifecycle.py`, `test_ai_authority_builder.py`, `test_ai_policy_builder_provider.py`, `test_ai_policy_builder_service.py`, `test_ai_policy_builder_text_extraction.py`, `test_auth_service_crypto.py`, `test_authority_context_service.py`, `test_bundle_builder.py`, `test_compiler_v2.py`, `test_decision_engine.py`, `test_intent_service_agent_gates.py`, `test_rbac_permissions.py`, `test_rego_generator.py`, `test_runtime_policy.py`, `test_runtime_policy_service_diff.py`, `test_signature.py`, `test_signing.py` — 166 tests passing as of this writing.

## 19.3 `src/` — frontend

```
src/
├── app/                  See 03_FRONTEND.md §3.4 for the full directory breakdown
│   ├── routes.tsx          The entire route tree — see 03_FRONTEND.md §3.3
│   ├── agents/              Agent Directory + Detail (Phase 9)
│   ├── ai-authority-builder/ Multi-document corpus upload + review
│   ├── ai-policy-builder/    Single-document upload + review
│   ├── auth/                 AuthContext, Login, SetupOwner, RequireAuth (Phase 10)
│   ├── components/           Layout (shell/nav), shared ui/ primitives
│   ├── help/                  In-app contextual help system
│   ├── live/                  Cross-cutting: apiClient, crypto.ts, key/token stores, 3 remaining Live* pages
│   ├── organization/          Organisation Settings + Users
│   ├── pages/                  PlatformOverview, NotFound, RouteErrorBoundary
│   └── policy-studio/          Manual authoring: list, workspace, publish, versions, review-queue
├── main.tsx                 Entry point
└── App.tsx                   Root component (providers)
```

## 19.4 `sdk-python/` — the Python SDK

```
sdk-python/
├── payreality/
│   ├── agent.py             The Agent class — see 11_AGENT_ARCHITECTURE.md §11.8
│   ├── auth.py, client.py, configuration.py, crypto.py, exceptions.py, models.py, retry.py
├── examples/                 register_agent.py, approve_payment.py, approve_invoice.py, custom_operation.py
├── tests/                     12 test files covering register/authorize/heartbeat/retire/rotate-keys/crypto/auth/retry
└── pyproject.toml
```

## 19.5 What to read, and in what order, if starting from zero

1. This specification's [00_INDEX.md](00_INDEX.md) and [01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) — orientation.
2. `server/app/domain/decision/engine.py` — the ~80-line file every other subsystem exists to feed.
3. `server/app/services/intent_service.py` — how the engine actually gets called, end to end.
4. `server/app/domain/compiler_v2/` (4 files, `rego_generator.py` first) — how a policy becomes what the engine queries.
5. `server/app/domain/evidence/signing.py` and `services/evidence_service.py` — how the record of all this becomes independently verifiable.
6. `server/app/db/models.py` — the complete data shape, read start to finish; every class docstring in this file is itself a design-decision record, not boilerplate.

This order mirrors [21_FOUNDER_LEARNING_GUIDE.md](21_FOUNDER_LEARNING_GUIDE.md)'s own recommended path, which goes into more depth on why this specific sequence.

## 19.6 What's not in this walkthrough

`node_modules/`, `dist/`, `.venv/`, `__pycache__/`, and other generated/vendored directories are omitted deliberately — they contain no authored code and regenerate from `package.json`/`pyproject.toml` on a clean install. `audit/` (this session's own working files) is likewise not part of the shipped product and is omitted from the architectural map above, though its contents remain in the repository as a historical record of prior review passes.
