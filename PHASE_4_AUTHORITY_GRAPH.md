# Phase 4: The Authority Graph

Status: proposed. Depends on Phase 1 (nodes and edges must exist as real foreign keys before traversal is possible) and benefits from Phase 3 (RTAL) as an authoring surface, but does not strictly require it.

## What changes from today

`RUNTIME_AUTHORITY_TRANSFORMATION.md` §1 and the earlier audit both found the same thing: today's "Authority Graph" is a naming choice over eight flat tables joined only through a parent `corpus_id`, with no foreign keys between principal/resource/operation, and `AuthorityRelationship` storing edges as plain text names rather than references. This phase makes the graph real — using the Phase 1 schema's actual foreign keys — without introducing a graph database.

## Nodes

Every node type is an existing or Phase-1-introduced relational table; there is no separate "graph node" table duplicating them:

- `Organization`
- `BusinessUnit`
- `Department`
- `Team`
- `Principal`
- `Agent`
- `Resource`
- Operation (a Vocabulary entry, per `MIGRATION_PLAN_V4.md` Phase A — a value, not a row with its own identity beyond that)
- `RuntimePolicy` (via `RuntimePolicyRecord`)

## Edges

All edges are foreign-key relationships already defined in Phase 1 — no new "edge" table beyond `AuthorityRelationship`:

- `Principal.organization_id → Organization` ("belongs to")
- `Principal.business_unit_id → BusinessUnit`, `.department_id → Department`, `.team_id → Team` ("belongs to," at whichever level is populated)
- `Agent.acting_for_principal_id → Principal` ("acts for")
- `Resource.owner_principal_id → Principal` ("owned by")
- `AuthorityRelationship.from_principal_id/to_principal_id`, typed by `kind` (`delegation`/`escalation`/`inheritance`), each additionally scoped by `resource_id`/`operation` and bounded by `valid_from`/`valid_to`/`status` ("delegates to," "escalates to," "inherits from")
- `RuntimePolicyRecord.scope.principal` (a name match against `Principal.name`) — the one remaining string-matched "edge," retained as-is since changing `Scope.principal` to a hard FK would be a breaking change to every stored policy; see Migration Notes.

## Relationships as first-class entities

`AuthorityRelationship` already is a first-class entity (a real table with real columns), and Phase 1's extension gives it real endpoints. What was missing — and what "first-class" means concretely here — is that a relationship carries its own attributes (validity window, revocation status, scope) rather than being an implied fact derived from two other rows agreeing on a string. That's exactly what Phase 1 added. This phase adds nothing further to the schema; it adds the traversal and promotion logic that makes the schema useful.

## Promotion

"Promotion" here means turning Authority Model data into an active `RuntimePolicy` — the same mechanism the AI Policy Builder's `promote_candidate` already implements for a single extracted candidate, generalized:

1. An `AuthorityRelationship` (a delegation, say) combined with any `Resource`/Operation/condition data implied by it is translated into a `RuntimePolicy` draft — the same translation table `PHASE_3_DSL.md` defines for RTAL clauses applies equally here, since an `AuthorityRelationship` and an RTAL `delegated_from` clause describe the same fact.
2. The draft enters Policy Studio's existing review lifecycle unchanged — draft → pending_review → approved → compiled → active. Promotion never auto-activates anything; a human approves it, exactly as every other authoring surface already requires.
3. Once active, the `RuntimePolicyRecord` gains a new, additive provenance field — `source_authority_relationship_id` — so a Decision's lineage (Phase 5) can trace all the way back through the policy to the specific Authority Model fact that generated it, and further back to the source governance document via that relationship's `source_excerpt`/`source_location`.

## Validation

Two distinct validation concerns, kept separate:

- **Structural validation** (does this edge even make sense — a delegation to oneself, a delegation with `valid_to` before `valid_from`, a cross-org edge missing the required `cross_org_approved` flag) happens at the moment an `AuthorityRelationship` is created or edited, mirroring `runtime_policy/validators.py`'s existing discipline (report a structured error, never raise, never silently accept malformed data).
- **Conflict detection against other Authority Model facts** (does this new delegation, once promoted, produce a `RuntimePolicy` that conflicts with an existing active one) reuses `scope_overlap.py`'s exact per-field overlap logic unchanged — promotion runs the resulting draft through the same `compile_bundle()` pipeline every other authoring surface already goes through, so a genuinely conflicting promotion fails to compile with the same `CONFLICTING_POLICY_STRUCTURE` error a human authoring the same conflict by hand would see. No new conflict-detection logic is needed; this phase's contribution is producing something `compile_bundle()` can validate, not re-validating it separately.

## Authority Traversal

All traversal is recursive CTEs over `AuthorityRelationship` and the `Principal` hierarchy columns — no graph query language, no graph database. Two traversal directions cover every stated use case:

- **Downstream** (from a Principal, what do they delegate onward, to whom): walk `from_principal_id = :start` recursively, following each `to_principal_id` as the next hop's `from_principal_id`, bounded by `status = 'active'` and current-time validity, to a configurable max depth (recommend starting at 5 — real delegation chains are shallow; a chain deeper than that is itself worth flagging as an organisational anomaly, not something to silently support indefinitely).
- **Upstream** (from a Principal, what authority reaches them, from whom): the same walk in reverse, starting from `to_principal_id = :start`.

## Impact Analysis — "What breaks if this changes?"

Run the upstream traversal from a given `AuthorityRelationship` or `Principal`, but instead of stopping at the Authority Model layer, join the result against every `RuntimePolicyRecord.source_authority_relationship_id` (from Promotion, above) that references any edge in the traversed set. The output: a concrete list of active `RuntimePolicy` rows that would need re-authoring or retirement if the given relationship or principal were revoked — surfaced as a warning *before* a revocation is confirmed, not discovered after the fact. This is an application-level function over two existing tables joined by one new FK column, not new infrastructure.

## Example Queries

**"Who can approve this payment?"**
Resolve the Intent's implied `Resource`/`operation`, then find every `Principal` with either a direct `RuntimePolicy` grant matching that scope, or an active inbound delegation (one-hop, from the direct lookup in Phase 2) covering it. A full upstream traversal is only needed if the direct lookup is empty and the question is "who, anywhere in the chain, could delegate this" — an audit question, not a runtime one.

**"Which authority reaches this agent?"**
`Agent.acting_for_principal_id` → upstream traversal from that Principal, returning every delegation edge and every `RuntimePolicy` whose scope matches the Principal or any principal in the traversed chain.

**"Which policies depend on this principal?"**
A direct, non-recursive query: every `RuntimePolicyRecord` whose `scope.principal` matches this Principal's name, plus (via the traversal above) every policy depending on a principal downstream of this one through delegation.

**"What breaks if this authority changes?"**
Covered under Impact Analysis, above.

**"Which AI agents inherit authority from this executive?"**
Downstream traversal from the executive's `Principal`, filtered to `kind IN ('delegation','inheritance')`, joined to `Agent.acting_for_principal_id` for every principal in the traversed set.

## Why this needs no graph database

Every query above is a bounded-depth walk (single digits in practice) over one edge table and a handful of hierarchy columns, with results in the tens to low thousands of rows even at real enterprise scale. Recursive CTEs over indexed foreign keys handle this comfortably; a graph database earns its complexity cost at traversal depths and edge-type variety this model doesn't have and has no near-term reason to grow into. Revisit only if real production data shows otherwise — not speculatively.

## Migration Notes

- No change to `Scope.principal`'s string-match semantics — `RuntimePolicy` continues to reference principals by name, exactly as today. The graph's FK-based edges are a layer *above* that string match, used for traversal and promotion, not a replacement for how the compiler already resolves scope.
- `source_authority_relationship_id` on `RuntimePolicyRecord` is a new, nullable column — every existing policy (authored before this phase, with no Authority Model provenance) simply has it null, and behaves identically in every other respect.
