# PayReality: Runtime Authority Transformation — Master Roadmap

Status: proposed. Nothing in this document has been implemented. This is the top-level index for the transformation program detailed in the companion `PHASE_*.md`, `IMPLEMENTATION_BACKLOG.md`, `GITHUB_PROJECT_STRUCTURE.md`, and `ARCHITECTURE_DECISIONS.md` documents. `RUNTIME_AUTHORITY_TRANSFORMATION.md` is the architectural source of truth this roadmap operationalizes; where the two disagree, that document wins and this one should be corrected.

## Vision

PayReality already answers one question deterministically, cryptographically, and fail-closed: *is this AI agent authorised to perform this action, right now?* The transformation program does not change that answer or how it's produced — the Decision Engine, OPA, and Evidence signing stay exactly as they are. What changes is everything *upstream* of that question: instead of authoring isolated Runtime Policies by hand, an enterprise's actual delegated-authority structure — who reports to whom, which business unit owns which resource, who can delegate what to whom, for how long — becomes a first-class, queryable model that *generates* Runtime Policies, rather than something a human has to manually re-derive every time a policy is written.

The end state: PayReality is the platform an enterprise's authority structure lives in, and Runtime Policies, OPA bundles, and Evidence records are what that structure *compiles to* — not what someone types by hand and hopes matches reality.

## Objectives

1. Eliminate the one live architectural risk found in the current platform (two uncoordinated writers to a shared enforcement target) before any new capability is built on top of it.
2. Give enterprises a real, relational Authority Model — organisations, business units, departments, teams, principals, roles, delegations, resources, operations — that today only exists as thin, disconnected fragments.
3. Introduce a human-readable, LLM-friendly Runtime Authority DSL as a new authoring surface for that model, compiling into the exact same `RuntimePolicy` representation every existing authoring path (manual Policy Studio, AI Policy Builder, AI Authority Builder) already produces.
4. Make the Authority Graph a real, queryable graph — using ordinary relational foreign keys, not a new database technology — supporting delegation-chain traversal and impact analysis.
5. Extend Evidence with cryptographic chaining, so the platform can prove not just "this record is authentic" but "this entire history is authentic and complete."
6. Do all of this additively. Nothing existing gets rewritten; existing strengths (deterministic OPA enforcement, cryptographic Evidence, the AI builders, versioned Policy review workflows) are extended, never replaced.

## Current Architecture (as implemented today)

```
Agent (Ed25519-signed request)
   ↓
Intent (immutable)
   ↓
Decision Engine — single OPA query, effect precedence (review > allow > deny > fallback)
   ↓
OPA — one shared "authorization" package, TWO independent writers today (legacy + Compiler V2)
   ↓
Decision (ALLOW / DENY / HUMAN_REVIEW)
   ↓
Evidence (signed, immutable, independently verifiable, not yet chained)

Feeding OPA: Runtime Policy authoring (manual, or promoted from AI Policy Builder / AI Authority Builder
candidates) → Compiler V2 (validate → vocabulary check → conflict detection → Rego) → deploy

Disconnected from enforcement: AI Authority Builder's extracted Principals/Resources/Operations/
Relationships — flat, string-linked, read-only, no promotion path
```

Full detail: `RUNTIME_AUTHORITY_TRANSFORMATION.md` §1–§4.

## Future Architecture (target state)

```
Enterprise Governance Documents
   ↓
Authority Extraction (existing AI Authority Builder, unchanged)
   ↓
Authority Model (Organisations, Business Units, Departments, Teams, Principals + role/org/dept,
                 Resources, real Delegation/Escalation/Inheritance edges, Vocabulary)
   ↓
Authority Graph (the same entities, queryable: chains, inheritance, revocation, impact analysis)
   ↓
Runtime Authority Context (per-request enrichment: resolved org/dept/delegation chain/risk/time)
   ↓
Authority Resolution (context assembly only — not policy pre-filtering, see PHASE_2)
   ↓
Runtime Policies (Compiler V2 — unchanged; now also generated from the Authority Model and
                   authorable via the Runtime Authority DSL)
   ↓
Decision Engine (unchanged)
   ↓
Evidence (chained, with full lineage: Decision → Policy → Authority Model → source document)
```

Full detail and the component dependency graph: `RUNTIME_AUTHORITY_TRANSFORMATION.md` §3–§4.

## Success Metrics

These are architectural/engineering metrics, not go-to-market ones — this program is infrastructure, not a customer feature launch by itself.

| Metric | Target | Why it's the right measure |
|---|---|---|
| Number of live OPA-writing code paths | 1 (down from 2) | Directly measures whether Phase 0's core risk is closed |
| RuntimePolicy authoring surfaces producing byte-identical internal objects | 3+ (manual UI, AI builders, DSL) with 0 divergent internal representations | Proves the DSL is additive, not a parallel system |
| `Constraints` fields that are stored but never enforced | 0 (down from 2: `risk_level`, `expires`) | Directly measures whether Phase 1's model additions are actually wired to enforcement, not just schema |
| Evidence records with a verifiable chain link to their predecessor | 100% of records created after Phase 5 ships | Measures whether chaining is actually live, not just designed |
| Existing test suite pass rate through every phase | 100%, continuously | The single strongest signal that "additive" claims are actually true, not just asserted |
| Delegation-chain queries answerable without a graph database | All four example queries in `RUNTIME_AUTHORITY_TRANSFORMATION.md` §3 | Validates the "relational, not graph-DB" constraint holds under real use |

## Timeline (indicative, 12–18 months, engineering-effort-ordered not calendar-committed)

| Quarter (relative) | Phase(s) | Theme |
|---|---|---|
| Q1 (months 1–2) | Phase 0 | Stop the bleeding: unify the OPA-writing path |
| Q1–Q2 (months 2–5) | Phase 1 | Authority Model schema and enforcement wiring |
| Q2 (months 4–6) | Phase 2 | Runtime Authority Context assembly |
| Q2–Q3 (months 5–9) | Phase 3 | Runtime Authority DSL — grammar, parser, editor tooling |
| Q3 (months 7–10) | Phase 4 | Authority Graph traversal, promotion, impact analysis |
| Q3–Q4 (months 8–11) | Phase 5 | Evidence chaining and lineage |
| Q4+ (months 10–18) | Phase 6 | Platform capabilities (simulation, replay, explorers) — ongoing, not a single milestone |

Phases overlap deliberately: Phase 1 (schema) and Phase 2 (context assembly) share almost all of their risk surface and are natural to run as one engineering effort with two shippable checkpoints. Phase 3 (DSL) can start its grammar design in parallel with Phase 1's schema work, since the DSL's target representation (`RuntimePolicy`) doesn't change — only what data it can *reference* (department, org, resource) depends on Phase 1 landing first.

## Milestones

1. **M0 — Single writer.** Legacy Authority/Mandate authoring surface disabled; one OPA-writing path remains. Rollback plan verified (Phase 0).
2. **M1 — Authority Model live.** New schema deployed; zero behavior change to existing policies; at least one internal (non-customer-facing) policy authored referencing department/org context. (Phase 1)
3. **M2 — Context-aware conditions.** A real policy in Policy Studio conditions on `context.department` or `context.organization` and evaluates correctly end-to-end. (Phase 2)
4. **M3 — DSL v1.** A hand-written `.rtauth` file compiles to a `RuntimePolicy`, passes through the existing compile/dry-run/deploy pipeline unmodified, and produces a correct live decision. (Phase 3)
5. **M4 — Graph traversal live.** All four example queries from `RUNTIME_AUTHORITY_TRANSFORMATION.md` §3 answerable via a real endpoint. (Phase 4)
6. **M5 — Chained evidence.** A tampered historical Evidence record (in a test environment) is detectable via chain-verification, not just signature-verification. (Phase 5)
7. **M6+ — Platform capabilities**, shipped incrementally, no single "done" milestone (Phase 6).

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| The two-writer OPA conflict causes a real incident before Phase 0 ships | High | Treat Phase 0 as pre-work, not part of the 12–18 month program — start immediately, independent of sequencing below |
| DSL grammar decided too early, before real authoring patterns are known from Phase 1/2 usage | Medium | Ship DSL v1 covering only what Phase 1's schema already supports; extend the grammar additively per new Authority Model capability, never redesign it |
| Evidence chaining breaks verifiability of historical records | High | Explicit `payload_version` field (already recommended in `DOMAIN_REFACTOR_PLAN.md` item 8 for an unrelated Evidence change) — old records verify under their original shape permanently |
| Authority Graph traversal queries become a performance problem at real delegation-chain depth | Low today, worth monitoring | Recursive CTEs over indexed FK columns handle realistic delegation depths (single digits) trivially; revisit only with real production evidence of a problem |
| Scope creep into premature domain adapters, graph databases, or OPA replacement | Medium — explicitly named across every phase doc's own "what not to build" section | Each phase doc states its own deferred items explicitly; `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8 is the standing reference |

## Dependencies

- Phase 1 depends on Phase 0 (don't build new schema on top of an uncoordinated write path).
- Phase 2 depends on Phase 1 (context enrichment needs the schema to enrich from).
- Phase 3 (DSL) depends on Phase 1 for full expressiveness, but its grammar/parser design can start in parallel.
- Phase 4 (Graph) depends on Phase 1's Delegation/Escalation/Inheritance edges existing as real FKs.
- Phase 5 (Evidence chaining) has no dependency on Phases 1–4 — it can proceed independently, any time.
- Phase 6 (Platform capabilities) depends on whichever of Phases 1–5 a given capability builds on (e.g. Policy Simulation reuses the existing dry-run mechanism directly and has no Phase 1–5 dependency; Authority Explorer depends on Phase 4).

## Document Index

| Document | Covers |
|---|---|
| `RUNTIME_AUTHORITY_TRANSFORMATION.md` | Architectural source of truth: audit, Authority Model schema, target architecture, migration discipline |
| `PHASE_0.md` | Legacy removal & platform stabilisation |
| `PHASE_1_AUTHORITY_MODEL.md` | Full Authority Model design |
| `PHASE_2_RUNTIME_CONTEXT.md` | Runtime Authority Context assembly |
| `PHASE_3_DSL.md` | Runtime Authority DSL grammar and design |
| `PHASE_4_AUTHORITY_GRAPH.md` | Real, relational Authority Graph |
| `PHASE_5_EVIDENCE.md` | Evidence chaining and lineage |
| `PHASE_6_PLATFORM.md` | Future platform capabilities |
| `IMPLEMENTATION_BACKLOG.md` | Every phase as granular, GitHub-Issue-ready backlog items |
| `GITHUB_PROJECT_STRUCTURE.md` | Repository/process structure for executing this program |
| `ARCHITECTURE_DECISIONS.md` | ADR-001 through ADR-007 |
