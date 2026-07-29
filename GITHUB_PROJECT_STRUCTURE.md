# GitHub Project Structure for the Runtime Authority Transformation

Status: proposed. This document recommends how to organize the repository's issue tracker, branching, and release process to execute `MASTER_ROADMAP.md` — it does not itself change any code.

## Milestones

One GitHub Milestone per phase, matching `MASTER_ROADMAP.md` exactly — not per quarter, not per sprint. Phases already carry their own dependency order; a calendar-based milestone would fight that ordering the first time a phase runs long or short.

| Milestone | Maps to |
|---|---|
| `Phase 0: Stabilisation` | `PHASE_0.md` |
| `Phase 1: Authority Model` | `PHASE_1_AUTHORITY_MODEL.md` |
| `Phase 2: Runtime Context` | `PHASE_2_RUNTIME_CONTEXT.md` |
| `Phase 3: RTAL` | `PHASE_3_DSL.md` |
| `Phase 4: Authority Graph` | `PHASE_4_AUTHORITY_GRAPH.md` |
| `Phase 5: Evidence Engine` | `PHASE_5_EVIDENCE.md` |
| `Phase 6: Platform` | `PHASE_6_PLATFORM.md` — an open-ended milestone; individual capabilities close independently rather than waiting for the whole milestone |

Every Issue closes into exactly one Milestone, matched to its `BL-<phase>.<n>` ID in `IMPLEMENTATION_BACKLOG.md`.

## GitHub Projects (board view)

One Project board per active phase, not one board for the whole program — a single board spanning Phase 0 through Phase 6 would bury the near-term, actionable work under a year-plus of not-yet-relevant items. Columns: `Backlog` → `Ready` (dependencies satisfied, per the backlog's own dependency field) → `In Progress` → `In Review` → `Done`. Close a phase's board when its Milestone closes; open the next phase's board only once its dependencies (per `MASTER_ROADMAP.md`'s Dependencies section) are actually satisfied, not preemptively.

## Labels

Two independent label dimensions, applied together on every Issue:

**Phase labels** (one per Issue, matches its Milestone): `phase-0`, `phase-1`, `phase-2`, `phase-3`, `phase-4`, `phase-5`, `phase-6`.

**Type/risk labels** (as many as apply):
- `schema-change` — touches a DB table/column
- `compiler` — touches `compiler_v2`, `rego_generator`, `bundle_builder`, or the legacy `compiler.py`
- `decision-engine` — touches `domain/decision/engine.py` or the OPA query path (should be rare — flag any such Issue for extra review, per `RUNTIME_AUTHORITY_TRANSFORMATION.md`'s finding that this module is already correct and least in need of change)
- `evidence` — touches signing/verification/chaining
- `frontend`
- `breaking-change` — should almost never appear per this program's additive discipline; its presence on any Issue is itself a signal to stop and re-read `MASTER_ROADMAP.md`'s constraints before proceeding
- `needs-adr` — the work implies a decision significant enough to warrant a new ADR before implementation starts (see below)

## Epics

Represented as a tracking Issue per phase (not a separate GitHub feature — plain Issues with a checklist of every `BL-*` Issue in that phase, linked), titled `Epic: Phase N — <name>`. Each Phase doc (`PHASE_1_AUTHORITY_MODEL.md`, etc.) is the Epic's design reference; the Epic Issue itself stays a thin checklist, not a duplicate of the design doc's content.

## Feature Branches

- One branch per `BL-*` Issue: `phase-<n>/<bl-id>-<short-description>` (e.g. `phase-1/bl-1.5-authority-relationship-extension`).
- No long-lived phase branches. Every `BL-*` PR merges to `main` directly once reviewed, following this program's own additive discipline — there is nothing to "integrate later" if every change is independently safe, which is precisely the property every phase document above was designed to guarantee. A long-lived integration branch would be a sign that discipline slipped, not a normal part of the process.
- Migrations (schema changes) land in their own PR, separate from the application-code PR that starts using the new schema, so a migration can be reviewed and rolled back independently of the feature it enables — matching `PHASE_0.md`'s own rollback-strategy reasoning applied consistently across every phase.

## Release Strategy

- Continuous deployment per merged PR, exactly as this codebase already operates today (confirmed this engagement: a `main` push auto-triggers a Render/Vercel deploy). No batch releases, no release branches — every phase document's "additive, verify, then proceed" discipline is what makes this safe, not a release-train process layered on top of it.
- Tag a lightweight release marker (`git tag phase-N-complete`) when a phase's Milestone closes, purely for historical reference — not a deployment gate.
- Database migrations follow standard expand/contract discipline: add-only in the same release that introduces a feature; removal of anything (Phase 0's dead columns, eventual legacy code deletion) is always a separate, later, explicitly-decided release, never bundled with the change that made removal possible.

## Architecture Decision Records (ADRs)

- Live in `docs/adr/` as `NNNN-title.md`, numbered sequentially, one decision per file, never edited after merge (a changed decision gets a new ADR that supersedes the old one, linked both ways) — standard ADR discipline, applied here specifically because this program will generate real decisions worth recording permanently (grammar choices for RTAL, chaining scope for Evidence, traversal depth limits for the Graph).
- The initial seven (`ARCHITECTURE_DECISIONS.md`, this program's ADR-001 through ADR-007) are committed as the first entries in `docs/adr/` verbatim.
- Any Issue labeled `needs-adr` must have a merged ADR before its implementation PR is opened, not after — the ADR is where alternatives get argued, before code makes the decision moot.

## RFC Process

For anything not already covered by a Phase document (a genuinely new idea arising during implementation, not anticipated by this roadmap): write a short RFC as a PR against a new file in `docs/rfcs/`, following the same evidence-and-alternatives discipline every existing doc in this repository already uses (see `DOMAIN_REFACTOR_PLAN.md`'s per-item Risk/Breaking-change/Migration-strategy structure as the template). An RFC that's accepted either becomes a new ADR (a decision) or a revision to the relevant Phase document (a plan change) — RFCs themselves are not a permanent decision record, they're the discussion that produces one.

## Documentation Standards

- Every Phase document, ADR, and RFC states explicitly what it does *not* recommend building yet, and why — this program's single most consistent discipline, and the one most worth preserving as new documents are added.
- Every claim about the current codebase must cite a specific file/function, never "the system currently..." without a reference — matching the standard this document set and `RUNTIME_AUTHORITY_TRANSFORMATION.md` already hold themselves to.
- No document describes a change as complete until it has passing tests demonstrating it — a Phase document describes a plan; only a merged PR with its Issue closed represents actual status. Keep the two visibly distinct (this roadmap set is entirely "proposed," never edited to claim completion — completion status lives in Issues/Milestones, not in these files).

## Versioning

- The application itself has no public API version number today (`POST /v1/intents` etc. are already prefixed `/v1/` — that prefix already exists and is untouched by this program).
- RTAL (Phase 3) introduces the first artifact in this program that needs its own version discipline, independent of the application's: the `# rtal-version: 1` file-header tag defined in `PHASE_3_DSL.md`, allowing a future grammar revision to coexist with existing files during a migration window.
- Evidence's `payload_version` field (Phase 5) is the second: old (v1) and new (v2, chained) records must both remain independently verifiable forever, so the version tag is permanent metadata on every record, not a migration flag that gets removed later.
