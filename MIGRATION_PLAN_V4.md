# Migration Plan V4: Universal Runtime Authority

A phased plan, not a phase. Each phase below is scoped the way every implementation phase in this engagement has been scoped so far (Phase 1: Runtime Policy Language, Phase 2: Compiler V2, Phase 3: Policy Studio, then AI Policy Builder): independently reviewable, independently shippable, and additive until an explicit, separately-approved deprecation step. This document is the plan; none of these phases are executed as part of the current (planning) phase.

Every phase below is designed to satisfy the constraint that mattered most in scoping this work: **do not break Compiler V2, the Runtime Engine, Evidence, OPA, Policy Studio, or existing APIs.** Where a phase touches one of those, the specific backward-compatibility mechanism is stated explicitly, not assumed.

## Phase A: Generalize the vocabulary source

**Goal**: replace the single hardcoded `FinancialVocabulary` (`domain/compiler_v2/compiler_v2.py`) and its upstream source (`domain/decision/scope_vocabulary.py::KNOWN_SCOPES`) with a customer-scoped vocabulary registry, while every existing policy, bundle, and API response looks identical.

**Mechanism**: introduce a `Vocabulary` table (organisation-scoped rows: known Operations, known Resource Types) seeded, at migration time, with exactly today's `KNOWN_SCOPES` values for the existing (implicit, single-tenant) organisation. `FinancialVocabulary` becomes the seed data for that one row, not a class the Compiler imports directly. `compile_bundle()`'s signature (`policies, bundle_id, bundle_version`, plus an injected `Vocabulary`) does not change; only what gets injected at the call site changes, from an always-financial class instance to a registry lookup.

**Backward compatibility**: with exactly one organisation and one seeded vocabulary (today's real state), behavior is bit-for-bit identical. This phase is invisible in production until a second vocabulary is actually registered.

**Touches**: `domain/decision/scope_vocabulary.py`, `domain/compiler_v2/compiler_v2.py`, one new table + migration, `runtime_policy_service.py`'s call sites that construct a `Vocabulary` for `compile_bundle()`. Does not touch `rego_generator.py`, `bundle_builder.py`, `dry_run.py`, or `domain/decision/engine.py`.

## Phase B: Introduce Operation and Resource Type as additive Scope fields

**Goal**: `Scope` gains `operation: str | None` and `resource_type: str | None`, alongside the existing `action: str` (`RESOURCE_MODEL.md`, `OPERATION_MODEL.md`). `action` is not removed or renamed in this phase.

**Mechanism**: a policy may specify either `action` (legacy shape) or `operation` + `resource_type` (new shape). At the compiler boundary, both shapes are normalized to the same internal matching key before Rego generation, so `rego_generator.py` and every downstream consumer (`bundle_builder.py`, the Decision Engine, OPA) sees one consistent shape regardless of which one the policy's author used. A policy authored as `action="vendor_payment"` and one authored as `operation="approve", resource_type="vendor_payment"` compile to equivalent Rego and produce equivalent Evidence.

**Backward compatibility**: every currently-stored `runtime_policy_records` row (all `action`-shaped, as of this writing) continues to compile, dry-run, and deploy unmodified; zero data migration required for this phase. New policies may use either shape.

**Touches**: `domain/runtime_policy/runtime_policy.py::Scope` (additive fields only), `domain/runtime_policy/validators.py` (accept either shape as valid; reject a policy specifying neither), `domain/compiler_v2/rego_generator.py::generate_scope_block` (normalize before generating). Does not touch `domain/decision/engine.py`: the Decision Engine consumes compiled Rego, never `Scope` directly, so it is unaffected by this phase by construction.

## Phase C: Extend Policy Studio and AI Policy Builder

**Goal**: Policy Studio's `ScopeFields` component offers Operation + Resource Type as the primary way to author a new policy's scope, backed by Phase A's registry (`GET /v1/runtime-policies/vocabulary` extended to return Operations and Resource Types, not just today's flat action list). The AI Policy Builder's extraction prompt (`PROMPT_LIBRARY.md`) is regenerated from the same registry lookup it already uses today (it already imports `FINANCIAL_VOCABULARY` rather than hardcoding a second copy, per `DOMAIN_AGNOSTIC_ARCHITECTURE.md`), so this phase requires no prompt-schema redesign, only pointing the existing lookup at the new registry instead of the old hardcoded class.

**Backward compatibility**: existing draft/pending_review/approved policies authored with the legacy `action` field continue to display and edit correctly (Policy Studio reads whichever shape a given version was authored in). No existing endpoint's response shape changes; the vocabulary endpoint gains fields, it does not remove or rename any.

**Touches**: `src/app/policy-studio/components/ScopeFields.tsx`, `routers/runtime_policies.py::get_vocabulary`, `domain/ai_policy_builder/claude_provider.py`'s vocabulary injection call site. Does not touch Compiler V2, the Decision Engine, Evidence, or OPA.

## Phase D: Retire, don't refactor, the legacy Authority/Mandate pipeline

**Goal**: stop authoring new policies through `domain/compiler/compiler.py`'s `REGO_TEMPLATE` path and the `Authority`/`Mandate` tables, since `DOMAIN_AGNOSTIC_ARCHITECTURE.md` found this pipeline schema-coupled to `amount`/`currency` at the database column level, not just the vocabulary level; generalizing it in place would mean redesigning `Authority`/`Mandate`'s actual columns, which RuntimePolicy already replaces functionally with a generic `Condition` model.

**Mechanism**: (1) a one-time backfill that reads every currently-`active` legacy `Policy`/`Mandate` set and produces an equivalent `RuntimePolicy` draft per distinct principal+scope grant (mechanically: `max_amount`/`currency` become a `Condition{field: "resource.amount", operator: "<=", value: max_amount}` plus, if `currency` is set, a second condition on `resource.currency`); (2) each backfilled draft goes through Policy Studio's real review lifecycle (submit for review, approve, compile, dry-run against historical intents, deploy) like any other policy, never auto-promoted; (3) once every backfilled policy has been reviewed and deployed, the legacy pipeline's *authoring* surface (`POST /v1/policies/documents`, the DoA upload flow) is disabled, not deleted, its data preserved for audit continuity.

**Backward compatibility**: the legacy pipeline is never modified in this phase, only stopped from being the thing new authority gets granted through. `Evidence` records already produced by decisions made under the legacy pipeline are untouched and remain independently verifiable, exactly as `EVIDENCE`'s append-only, tamper-evident design already guarantees regardless of which compiler produced the policy behind a given decision.

**Touches**: no changes to `domain/compiler/compiler.py`, `db/models.py::Authority`/`Mandate`, or `services/policy_service.py` in this phase; this phase is entirely about what gets authored going forward, not about editing what already exists. Actual removal of the legacy code paths is an explicit, separate, later decision, made only once nothing in production still depends on them, and only with direct user sign-off given how consequential deleting a production authorization path is.

## Phase E: Deprecate `action` as a first-class field

**Goal**: once every stored `runtime_policy_records` row has been authored or re-authored with `operation`+`resource_type` (either natively, from Phase B onward, or via Phase D's backfill), stop treating `action` as anything other than a derived, read-only display value.

**Precondition**: a verification pass confirming zero `RuntimePolicyRecord` rows exist with `operation`/`resource_type` both null. This phase does not proceed until that precondition is independently confirmed against production data, not assumed.

**Touches**: `domain/runtime_policy/runtime_policy.py::Scope` (mark `action` as computed, not stored), `domain/runtime_policy/schema.py` (adjust serialization), Policy Studio's display components. This is the only phase in this plan that changes what gets *stored*, and it happens last, deliberately, after every consumer already tolerates the new shape from Phase B onward.

## Phase F: Website and product positioning

**Goal**: align remaining copy with `PLATFORM_POSITIONING.md`'s recommendations. Lowest risk in this entire plan: it is a marketing-site content change, touches no backend, no Runtime Engine, no Compiler, no Evidence, and can happen on its own schedule, independent of Phases A-E, since `DOMAIN_AGNOSTIC_ARCHITECTURE.md` found the website's actual current copy is already closer to the target than the backend's vocabulary is.

## Ordering and independence

Phases A, B, and C are additive and can ship in that order with production traffic uninterrupted at every step; each is independently useful even if the plan stops there (Phase A alone already lets a second organisation's vocabulary exist; Phase B alone already lets a non-financial Resource Type be expressed). Phase D is the first phase with genuine operational weight (it changes what customers can newly author through) and is the natural point to pause and confirm with the user before proceeding, the same way Phase 3's "Deploy is real" design decision was confirmed explicitly before implementation, not assumed. Phase E depends on Phase D's backfill having actually completed in production, not just having been coded. Phase F has no dependency on any other phase.
