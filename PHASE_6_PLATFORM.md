# Phase 6: Platform Capabilities

Status: proposed, ongoing — not a single milestone. Each capability below is scoped to what it builds on; several already have a working precedent in the current codebase and are extensions, not new mechanisms. Sequence each independently, against real user demand, rather than as a single "Phase 6 release."

## Policy Simulation / "What If" / Authority Simulation

**Already exists, in miniature**: `domain/compiler_v2/dry_run.py` already does exactly this for a single candidate bundle — rewrite its package to a disposable name, load it into OPA alongside the live bundle, query it, delete it, all without affecting live traffic (verified end-to-end by `test_dry_run_never_affects_the_live_bundle`). Policy Simulation is this same mechanism, extended to accept a *set* of hypothetical changes (a new policy, an edited existing one, a revoked delegation) and a *batch* of sample Intents (historical ones, or synthetic ones), reporting how the outcome would change for each. Authority Simulation is the same capability applied one layer up — simulate a change to the Authority Model (Phase 1) and observe which downstream `RuntimePolicy` outcomes would shift, using Phase 4's Impact Analysis traversal to find the affected policy set first, then dry-running each.

## Replay Engine

Re-execute a historical Intent's decision against a *different* (past or hypothetical) policy bundle version, using the exact same `evaluate()`/OPA path real decisions use — not a separate simulated interpreter, the same discipline `dry_run.py`'s own architecture already insists on ("reuse the exact same result-interpretation code path... or the two could silently drift"). Useful for two distinct purposes: audit ("what would this decision have been under last quarter's policy") and regression-testing a new policy version against real historical traffic before deploying it.

## Runtime Analytics

Aggregate reporting over `Decision`/`Evidence`/`Intent` — outcome counts and trends by principal, department, organisation, risk band, over time. This is a read-only reporting layer over data that already exists in full; no new capture is required, only aggregation and presentation. The existing `LiveAssurance.tsx` rollup is the direct predecessor to extend, not replace.

## Authority Explorer

A UI over Phase 4's traversal queries — browse an organisation's structure, click a Principal, see their direct and inherited authority, their delegation chain in both directions. This is a frontend capability with no new backend mechanism beyond what Phase 4 already defines; sequence it once Phase 4's traversal queries are live and proven correct via direct API/CLI use first.

## Governance Explorer

A UI over the Authority Model and Authority Graph together — organisations, business units, departments, teams, and the governance documents (`AuthorityCorpus`) that generated the Authority Model facts underneath them, with Phase 5's Authority Lineage making "which document justified this" a first-class, clickable trace rather than something only visible in raw `AuthorityRelationship.source_excerpt` text.

## Policy Diff

**Already exists, partially**: `VersionsPage.tsx`'s `policyStudioApi.diff` already computes and displays a diff between two versions of one `RuntimePolicy`. The Phase 6 extension: diff across an Authority Model change's *downstream effect* on multiple policies at once (reusing Phase 4's Impact Analysis to find the affected set, then running today's existing per-policy diff over each) — an aggregation of an existing capability, not a new one.

## Risk Heatmaps

A visualization over Runtime Analytics' aggregated risk-band data (Phase 2's `context.risk_level`, already computed for every decision), sliced by department/organisation/time — a presentation layer with no new data-capture requirement, since risk classification already happens on every decision today.

## AI Explainability

Every Decision the Decision Engine produces already carries `evaluated_mandates` (which policies matched) and a `reason` (`deny_reason`/`review_reason`, or the fallback `no_policy_covers_scope`/`undetermined`). AI Explainability is a presentation layer that renders this already-captured data as a human-readable narrative — "ALLOW, because Runtime Policy 'Vendor Payments — Standard Limit' matched, condition amount <= 50,000 satisfied" — using Phase 4's lineage to also surface which Authority Model fact (if any) generated the matched policy. This is explanation of an already-deterministic decision, not a new inference layer — nothing here asks an LLM to explain a decision that wasn't already fully explainable from existing structured data; an LLM, if used at all, is only ever turning that existing structured data into prose, never adding new judgment to the decision itself.

## Enterprise Search

Full-text/faceted search across Principals, Resources, Policies, Evidence, and governance-document source excerpts — an indexing/search-infrastructure capability (e.g. Postgres full-text search, or an external search index if scale later demands it) over data that already exists in full. No new data model; a search index over the existing one.

## Delegation Explorer

A UI over Phase 4's downstream/upstream delegation traversal specifically — narrower than the general Authority Explorer, focused on answering "who delegates to whom, and through how many hops" as its own dedicated view, since delegation chains are likely to be the single most-asked-about relationship type in practice (matching the example queries `RUNTIME_AUTHORITY_TRANSFORMATION.md` §3 and `PHASE_4_AUTHORITY_GRAPH.md` both center on).

## Decision Replay / Historical Reconstruction

The user-facing surface for Phase 5's Timeline Reconstruction and the Replay Engine above: given a time range and an Organisation, render the complete, chain-verified sequence of decisions, with each one's full lineage (Phase 5) one click away. This is the capability that makes the Evidence Engine's chaining and lineage work legible to a human — an auditor, a board member, an insurer — rather than only verifiable via a script.

## Sequencing note

Every capability above names its own dependency explicitly. None requires all of Phases 1–5 to exist before any of it can start: Policy Simulation and Replay Engine need only today's existing `dry_run.py`/`evaluate()` mechanisms and can begin immediately, independent of this entire program; Authority Explorer/Delegation Explorer need Phase 4; Decision Replay/Historical Reconstruction need Phase 5. Sequence each against real, demonstrated user demand — this phase is explicitly "ongoing," not a single release with a completion date, and nothing here should be built speculatively ahead of a real request for it.
