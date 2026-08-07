# Glossary

Every term of art used across this specification, defined once. Alphabetical. Each entry cross-references the part where it's covered in depth.

**Agent** — A certificate-holding identity, acting for a Principal, that submits signed Intents. Has a full lifecycle (registered → active ⇄ suspended → revoked/retired). [11_AGENT_ARCHITECTURE.md](11_AGENT_ARCHITECTURE.md)

**Assurance** — A live read of what's actually running (agent counts, active policy, decision volume by outcome), computed from the database on every request, never a cached or seeded score. [01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) §1.3

**Authority** — The delegated, scoped, time-bounded right to act. Two historical representations exist: the retired Authority/Mandate model, and the current Authority Model (`AuthorityRelationship` with real FKs). [08_RUNTIME_AUTHORITY.md](08_RUNTIME_AUTHORITY.md), [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md)

**Authority Graph** — The AI Authority Builder's full extraction result for one corpus: policies, principals, resources, operations, relationships, conflicts, gaps, and questions. [09_AI_AUTHORITY_BUILDER.md](09_AI_AUTHORITY_BUILDER.md)

**Authority Model** — Phase 1's real organisational hierarchy (`BusinessUnit → Department → Team`) and delegation graph. [08_RUNTIME_AUTHORITY.md](08_RUNTIME_AUTHORITY.md)

**Bundle / Policy Bundle** — The compiled, versioned Rego module produced by Compiler V2 from a set of `RuntimePolicy` objects; identified by a `bundle_hash` computed over its Rego source and manifest (excluding the compile timestamp, so identical input always hashes identically). [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md) §7.6

**Certificate** — An Agent's Ed25519 keypair record (public key only, server-side); status one of `issued/active/rotated/expired/revoked`. At most one `active` per agent, enforced by a partial unique DB index. [11_AGENT_ARCHITECTURE.md](11_AGENT_ARCHITECTURE.md) §11.3

**Chain scope** — The `organization_id` an Evidence record's hash-chain is partitioned by; `NULL` is itself a valid, consistent scope. [13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md) §13.3

**Compiler V2** — The current, sole Rego-generating compiler (`domain/compiler_v2/`), replacing the retired legacy `domain/compiler/`. [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md)

**Decision** — The outcome of evaluating one Intent: `ALLOW`, `DENY`, or `HUMAN_REVIEW`, never a fourth value. Immutable after creation. [12_DECISION_ENGINE.md](12_DECISION_ENGINE.md)

**Decision Engine** — `domain/decision/engine.py::evaluate()`, the pure function with exactly one code path to `ALLOW`. [12_DECISION_ENGINE.md](12_DECISION_ENGINE.md) §12.1

**Evidence** — An Ed25519-signed, append-only record of a Decision (or a later resolution of one). Chained per organisation since Phase 5. [13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md)

**Fail-closed** — The design principle that any ambiguity, error, timeout, or absence of a covering policy resolves to `HUMAN_REVIEW`, never `ALLOW`. [12_DECISION_ENGINE.md](12_DECISION_ENGINE.md) §12.5

**HUMAN_REVIEW** — One of the three Decision outcomes; requires a human to resolve via `resolution_service`, which appends a second Evidence record rather than mutating the first. [12_DECISION_ENGINE.md](12_DECISION_ENGINE.md), [13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md) §13.6

**Intent** — A signed request an Agent submits describing an action it wants to take (action, amount, currency, counterparty, context). One row per submission, replay-protected via `UNIQUE(agent_id, nonce)`. [12_DECISION_ENGINE.md](12_DECISION_ENGINE.md)

**Mandate** — A per-principal/scope limit compiled from an approved Authority, in the now-retired legacy pipeline. [17_LEGACY_COMPONENTS.md](17_LEGACY_COMPONENTS.md)

**OPA (Open Policy Agent)** — The external Rego-evaluating process the Decision Engine queries over HTTP. Never reachable from outside the backend's private network. [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) §2.1

**Operator key** — The single shared `ADMIN_API_KEY`; a full, permanent bypass of RBAC, checked first in `require_permission`. [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md) §14.1

**Permission** — A fixed, enumerated capability (e.g. `RUNTIME_POLICY_PUBLISH`); every enforcement point checks a Permission, never a Role directly. [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md) §14.2

**Principal** — The person, team, or organisation an Agent acts *for*, and who bears the risk of its actions. [05_DATABASE.md](05_DATABASE.md) §5.1

**RBAC** — Phase 10's role/permission system: six fixed roles, permission-only enforcement, sessions and API keys. [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md)

**Rego** — Open Policy Agent's policy language; what a `RuntimePolicy` compiles into. [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md) §7.5–7.6

**Role** — One of six fixed identities (`owner`, `governance_admin`, `agent_admin`, `reviewer`, `auditor`, `executive`) mapped to a Permission set. Never checked directly at an enforcement point. [14_SECURITY_MODEL.md](14_SECURITY_MODEL.md) §14.2

**RuntimeAuthority Context** — Phase 2's ephemeral, request-scoped enrichment of the OPA input (organisation, department, role, risk band, active delegations), merged under `context.authority`, never persisted, never a policy pre-filter. [08_RUNTIME_AUTHORITY.md](08_RUNTIME_AUTHORITY.md) §8.3–8.4

**RuntimePolicy** — The canonical, immutable value object every authoring path (manual, AI Authority Builder, AI Policy Builder) produces: scope, flat AND-only conditions, effect. [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md) §7.2

**RuntimePolicyRecord** — The persisted, versioned row backing a `RuntimePolicy`; one immutable row per version. [05_DATABASE.md](05_DATABASE.md) §5.1

**Scope (of a RuntimePolicy)** — Who a policy applies to and over what: `principal` and `action` required, `agent` and `resource` optional narrowing. [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md) §7.2

**Signing-key registry** — The `SigningKey` table and `signing_key_service.py`, preserving verifiability of records signed under a key that has since been rotated out. [13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md) §13.2

**Vocabulary** — The injectable protocol (`is_valid_action`) that keeps Compiler V2 domain-agnostic even though its one shipped implementation (`FinancialVocabulary`) is not. [07_RUNTIME_POLICY_ENGINE.md](07_RUNTIME_POLICY_ENGINE.md) §7.4
