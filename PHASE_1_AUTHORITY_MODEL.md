# Phase 1: The Authority Model

Status: proposed. Depends on Phase 0 (do not build new schema on top of an uncoordinated OPA-write path). Every table below is either a reuse of an existing table unchanged, an additive column on an existing table, or a genuinely new table — nothing here requires modifying the shape of `RuntimePolicy`, `Decision`, or `Evidence`.

## Design constraint: relational, not graph-database

Every entity and relationship in this document is expressed as an ordinary SQL table with foreign keys. A graph database is explicitly avoided (per the original request's own instruction, and consistent with `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8's reasoning): the traversal patterns this model needs — "who delegates to whom," "what does this principal inherit," "what breaks if this changes" — are all shallow, bounded-depth walks over a small number of edge types, which recursive Common Table Expressions (CTEs) over indexed foreign keys handle without any new infrastructure. Reach for a graph database only if a real, measured traversal need exceeds what a recursive CTE can do at acceptable latency — no such need exists today.

## Entities

### Organisation
**Reuse, unchanged.** `Organization` (`db/models.py`) already exists for RBAC. No schema change. What changes is that `Principal` (below) gains a real FK to it, so it finally participates in authority modeling, not just login.

### Business Unit
**New.** A business unit belongs to exactly one organisation.

```
BusinessUnit
  id            UUID, pk
  organization_id  UUID, fk -> organizations.id, not null
  name          text, not null
  created_at    timestamp
```

### Department
**New.** A department belongs to exactly one business unit. (Both levels exist because real enterprises distinguish "Finance" the business unit from "Accounts Payable" the department within it — collapsing them into one table would force every customer into a two-level hierarchy whether they have one or not; keeping them separate lets a department be optional.)

```
Department
  id                UUID, pk
  business_unit_id  UUID, fk -> business_units.id, not null
  name              text, not null
  created_at        timestamp
```

### Team
**New.** A team belongs to exactly one department, and is the level a Principal is most often actually assigned to day-to-day. Optional in the hierarchy — a Principal can belong directly to a Department with no Team, exactly as it can belong to a Department with no further Team subdivision.

```
Team
  id             UUID, pk
  department_id  UUID, fk -> departments.id, not null
  name           text, not null
  created_at     timestamp
```

### Principal
**Extend, additively.** Today: `id`, `name` only. New nullable columns:

```
Principal
  id                 UUID, pk                          [existing]
  name               text, not null                    [existing]
  organization_id    UUID, fk -> organizations.id, null [new]
  business_unit_id   UUID, fk -> business_units.id, null [new]
  department_id      UUID, fk -> departments.id, null   [new]
  team_id            UUID, fk -> teams.id, null         [new]
  role               text, null                         [new — matches the existing
                                                           AuthorityPrincipal.role
                                                           precedent; promoted to the
                                                           real table]
```

All new columns nullable: every existing `Principal` row (and everything that matches against `Principal.name` today — `RuntimePolicy.scope.principal`, `Agent.acting_for_principal_id` resolution) is completely unaffected until these fields are actually populated. **Not** modeled as a separate `Role` table with its own hierarchy — no current requirement demonstrates a need for role-to-role relationships beyond a label; add that normalization only once a real authoring need proves a string isn't enough (see `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8).

### Resource
**New**, promoting the currently-informational `AuthorityResource` concept into something the enforcement path can actually reference.

```
Resource
  id                 UUID, pk
  name               text, not null
  type               text, null     — e.g. "vendor_invoice", "purchase_order"
  owner_principal_id UUID, fk -> principals.id, null
  organization_id    UUID, fk -> organizations.id, null
  created_at         timestamp
```

`RuntimePolicy.scope.resource` remains a plain string for backward compatibility — every existing policy is unaffected. A policy *may* additionally reference `resource_id` once this table exists; the compiler resolves either shape (string match, or FK lookup then string match against `Resource.name`) to the identical Rego comparison it already generates today. No change to `rego_generator.py`'s actual comparison logic — only to what feeds it.

### Operation
**Reuse the existing Vocabulary design.** Operations (the generalized successor to today's fixed `action` vocabulary) are already fully designed in `MIGRATION_PLAN_V4.md` Phase A (an organisation-scoped `Vocabulary` table, seeded from today's `FinancialVocabulary`) and Phase B (`Scope` gains `operation`/`resource_type` alongside `action`, both shapes normalized to one matching key before Rego generation). This document does not re-design that — it is reused verbatim as the Operation piece of the Authority Model.

### Authority Relationship (Delegation / Escalation / Inheritance)
**Extend the existing table**, rather than replace it, so nothing that reads `AuthorityRelationship.from_principal`/`to_principal` today breaks:

```
AuthorityRelationship
  id                UUID, pk                              [existing]
  corpus_id         UUID, fk -> authority_corpora.id       [existing, extraction provenance]
  kind              text, check in ('delegation','escalation','inheritance')  [existing]
  from_principal    text                                   [existing — kept, now optional]
  to_principal      text                                   [existing — kept, now optional]
  description       text                                   [existing]
  confidence        numeric                                 [existing]
  source_excerpt     text                                   [existing]
  source_location    text                                   [existing]
  created_at         timestamp                              [existing]

  from_principal_id UUID, fk -> principals.id, null         [new — real edge]
  to_principal_id   UUID, fk -> principals.id, null         [new — real edge]
  resource_id       UUID, fk -> resources.id, null          [new — what the delegation covers, if resource-scoped]
  operation         text, null                              [new — what operation the delegation covers]
  valid_from        timestamp, null                          [new — Temporary Authority, below]
  valid_to          timestamp, null                          [new — Temporary Authority, below]
  revoked_at        timestamp, null                          [new — Revocation, below]
  revoked_by        text, null                               [new]
  status            text, check in ('proposed','active','revoked','expired'), default 'proposed' [new]
```

The text `from_principal`/`to_principal` columns stay exactly as they are — they're the AI-extraction provenance (what the source document literally said), which should never be silently overwritten by a resolved FK, since "what the document said" and "what we resolved it to" are two different facts worth keeping both of. `from_principal_id`/`to_principal_id` are the real, enforceable edge; they may be null (extracted but not yet resolved to a known Principal — an `AuthorityGap`/`AuthorityQuestion` candidate) or populated (a real, traversable edge).

This single extended table covers **Delegated Authority** (`kind='delegation'`, `from_principal_id` delegates to `to_principal_id`), **Escalations** (`kind='escalation'`, already a supported `kind` value, previously unused for anything but description), and **Inherited Authority** (`kind='inheritance'` — e.g. a Team inherits its Department's grants; modeled as an edge from the Team's "representative" concept to the Department, or more simply, inheritance is computed at traversal time from the `Principal.team_id`/`department_id`/`business_unit_id` hierarchy directly, with no separate edge needed for the common "org-structure implies inheritance" case — an explicit `inheritance`-kind edge is reserved for the *exception*, e.g. "this principal inherits authority from a role they don't organisationally report through").

### Authority Chains
Not a stored entity — a **computed traversal** over `AuthorityRelationship` edges where `kind='delegation'` and `status='active'`, walked via a recursive CTE from a given Principal outward (or inward) to bounded depth. See `PHASE_4_AUTHORITY_GRAPH.md` for the traversal design and example queries ("who can approve this," "what authority reaches this agent").

### Revocations
Modeled as a status transition on `AuthorityRelationship` (`status: 'active' → 'revoked'`, `revoked_at`/`revoked_by` populated), not a separate table — this mirrors the existing, proven pattern `Certificate`/`Agent` already use for their own revocation lifecycle (a status field plus a timestamp, never a row deletion). A revoked delegation is excluded from Authority Chain traversal from `revoked_at` onward, but the row itself is retained permanently for audit continuity, matching every other "nothing is deleted" guarantee this platform already makes.

### Temporary Authority
Modeled as `valid_from`/`valid_to` on `AuthorityRelationship`, directly reviving the pattern the legacy `Mandate.valid_from`/`valid_to` already proved out (and which Compiler V2 dropped when it replaced the legacy Authority/Mandate model — see `RUNTIME_AUTHORITY_TRANSFORMATION.md` §1's "no time-validity window" weakness). A delegation with a non-null `valid_to` in the past is excluded from Authority Chain traversal identically to a revoked one, without needing a separate expiry-sweep job — it's a comparison at query time, not a state that needs to be actively transitioned.

### Cross-Organisation Authority
Not a separate entity — an `AuthorityRelationship` edge whose `from_principal_id` and `to_principal_id` resolve to `Principal` rows with *different* `organization_id` values. This is explicitly **not** allowed by default: the Authority Resolution step (Phase 2) should treat a cross-organisation delegation edge as requiring an explicit flag (e.g. `AuthorityRelationship.cross_org_approved: bool, default false`) before it's honored in traversal — a real enterprise scenario (a shared-services principal acting across subsidiaries) is legitimate, but should never be *silently* possible just because someone typed a name that happened to resolve to a principal in a different organisation. This is a fail-closed default, consistent with the platform's existing "never silently allow" philosophy.

## What this phase deliberately does not include

- A first-class `Role` table with its own hierarchy or permission set — a string field on `Principal` is sufficient until a real need proves otherwise.
- A generic, typed edge system supporting arbitrary node-to-node relationship types beyond delegation/escalation/inheritance — no current requirement names a fourth kind, and the `CheckConstraint` on `kind` should stay closed (fail loud on an unrecognized kind, not silently accept anything) until one is actually needed.
- Any change to `RuntimePolicy`, `Scope`, `Condition`, `Effect`, the compiler, OPA, or the Decision Engine. This phase is entirely schema — Phase 2 is where this data starts actually reaching a decision.
- Automatic promotion of Authority Model data into `RuntimePolicy` — that's Phase 4/6 (`IMPLEMENTATION_BACKLOG.md` sequences it precisely), once the graph and traversal exist to do it safely.

## Migration Notes

- Every new column is nullable; every new table is new. Zero existing row changes shape.
- `BusinessUnit`/`Department`/`Team` can be seeded from the AI Authority Builder's already-extracted `AuthorityPrincipal.role`/`reports_to` free text on a best-effort basis (an operator-reviewed backfill, never automatic), but the tables themselves require no such data to exist and function correctly for a customer starting from zero.
- The `AuthorityRelationship` extension is a pure `ALTER TABLE ADD COLUMN` set — no data migration required for existing rows (all new columns default to null/`'proposed'`).
