# Architecture Decision Records

Format: Context, Decision, Alternatives Considered, Consequences. ADR-001 through ADR-004 are new decisions this transformation program makes. ADR-005 through ADR-007 are decisions the platform already made, in earlier phases of this engagement, being recorded formally here for the first time — retroactive documentation of a real decision already in force, not a new choice.

---

## ADR-001: Runtime Authority, Not Identity and Access Management

**Context**: An enterprise adopting PayReality could reasonably ask why this isn't "just IAM for AI agents" — IAM is a familiar, well-understood category, and PayReality's Agent/Certificate model resembles IAM's identity layer.

**Decision**: PayReality is positioned and architected around Runtime Authority — the question "is this specific action, right now, backed by delegated authority" — not Identity and Access Management's question, "does this identity have a role/permission." IAM answers a mostly-static question (what can this identity do, in general); Runtime Authority answers a per-action, per-moment question (is this specific attempted action, with these specific parameters, actually authorized right now, given the current, possibly-temporary, possibly-delegated state of the organisation's authority structure).

**Alternatives considered**:
- *Build IAM-style role/permission checks on top of the existing Agent/Certificate identity layer.* Rejected: a role/permission model answers "can Agent X ever do Y," which is exactly the coarse-grained question this platform's own design already rejects — `RuntimePolicy`'s condition model exists specifically because "can approve vendor payments" is meaningless without "up to what amount, and is that amount still within a currently-valid delegation."
- *Position as "governance" only, with enforcement as a secondary feature.* Rejected: the platform's central, differentiating claim is that authorization is evaluated deterministically before an action, not audited after one — see ADR-007. Positioning as governance-first would undersell the one thing IAM and pure-governance tools both lack: OPA sitting directly in the decision path.

**Consequences**: Every future capability (the Authority Model, the Graph, RTAL) must be justified by how it improves a *runtime decision*, not by how well it models an org chart in the abstract. An Authority Model feature that only helps someone browse organisational structure, with no path to a `RuntimePolicy` and a real Decision, is out of scope for this platform — that's IAM-shaped work, and belongs elsewhere.

---

## ADR-002: Additive Migration, Never a Rewrite

**Context**: The transformation this program describes touches nearly every part of the platform's data model (Principal, the Authority Graph, Evidence) and introduces a new authoring language. A rewrite — a new schema, a new compiler, a fresh start — was considered and is explicitly rejected.

**Decision**: Every phase in this program is additive: new nullable columns, new tables referenced optionally, new authoring surfaces producing the same internal `RuntimePolicy` object every existing surface already produces. Nothing existing is renamed, restructured, or removed without an explicit, separately-decided, later phase (Phase 0's legacy retirement is the one exception, and even there, data is disabled from new authoring, never deleted).

**Alternatives considered**:
- *A parallel "v2 platform" built alongside the current one, cut over once complete.* Rejected: this defers all risk to one enormous cutover event, the opposite of the incremental-verification discipline that has already found and fixed three real, previously-undiscovered production bugs this engagement (the deploy staleness bug, the OPA-persistence bug, the principal-name-resolution bug) — each caught specifically *because* changes were made and verified incrementally against a running system, not designed in isolation and cut over all at once.
- *Restructure `Scope`/`Condition`/`Effect` to natively support organisation/department/delegation as first-class fields, rather than layering them in via `context`.* Rejected: this would be a breaking change to every stored `RuntimePolicy`, and the existing `Condition`-on-`context` mechanism already does the job (see Phase 2) without touching the compiler at all.

**Consequences**: Every Phase document in this program explicitly names its own migration and, where relevant, rollback strategy — that discipline is not optional per-phase, it's the load-bearing property that makes "additive" a verifiable claim rather than an assertion.

---

## ADR-003: A Relational Authority Graph, Not a Graph Database

**Context**: "Authority Graph" as a name suggests graph-database technology (Neo4j, or an equivalent property-graph store). The transformation program's own request explicitly asked for this to be evaluated, "avoid graph databases unless absolutely necessary."

**Decision**: The Authority Graph (Phase 4) is implemented as ordinary relational foreign keys — `Principal.organization_id`/`business_unit_id`/`department_id`/`team_id`, `Resource.owner_principal_id`, `AuthorityRelationship.from_principal_id`/`to_principal_id` — traversed via recursive Common Table Expressions, not a graph query language or a separate datastore.

**Alternatives considered**:
- *Adopt Neo4j (or similar) as a dedicated graph store, synced from the relational database.* Rejected: introduces a second datastore to keep consistent with the first, a new operational dependency, and a new query language for the team to maintain expertise in — all to solve traversal patterns (`PHASE_4_AUTHORITY_GRAPH.md`'s five example queries) that are shallow, bounded-depth walks well within what a recursive CTE handles at negligible latency for realistic delegation-chain depths.
- *A generic, typed edge table supporting arbitrary node-to-node relationship kinds, in anticipation of future relationship types beyond delegation/escalation/inheritance.* Rejected for now: no current requirement names a fourth kind; a closed `CheckConstraint` that fails loud on an unrecognized kind is safer than a schema that silently accepts anything, until a real fourth kind is actually needed.

**Consequences**: If a future, real traversal need genuinely exceeds recursive-CTE performance at real production delegation-chain depth and volume, that's grounds to revisit this decision with a new ADR — but only against measured evidence of an actual problem, not speculatively. This mirrors `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8's identical reasoning about policy pre-filtering: don't build for a performance problem that hasn't been demonstrated.

---

## ADR-004: A Runtime Authority DSL, Compiling to the Existing `RuntimePolicy` Model

**Context**: Enterprises need an authoring surface better suited to bulk authoring, version control, and reliable LLM generation than a UI form provides, without asking anyone to write Rego directly (nobody does today, and shouldn't).

**Decision**: Introduce RTAL (`PHASE_3_DSL.md`) as a fourth authoring surface — alongside Policy Studio's form, the AI Policy Builder, and the AI Authority Builder — that compiles to the exact same `RuntimePolicy` object every other surface produces, and from there through the unmodified `compile_bundle()`/Rego/OPA pipeline.

**Decision, and why not Rego itself**: Rego is a general-purpose logic-programming language; RTAL is deliberately narrow, expressing only "this principal can do this operation on this resource, under these conditions, with this effect." That narrowness is a feature: it's what keeps every RTAL statement analyzable by the existing conflict detector (`scope_overlap.py`), and what keeps a compliance reviewer — not an engineer — able to read every statement an enterprise has ever authored.

**Alternatives considered**:
- *Expose Rego authoring directly, with better tooling/templates around it.* Rejected: Rego's full expressiveness is exactly what this platform's determinism and auditability guarantees depend on being *constrained*, not opened up — an authoring surface that could express arbitrary logic would undermine the same conflict-detection and human-readability properties RTAL is designed to preserve.
- *A visual/graphical policy builder instead of a text DSL.* Rejected as the primary surface (though not precluded later, as a Phase 6 capability): a graphical tool doesn't version-control, diff, or bulk-generate the way a text file does, and is a worse target for reliable LLM generation than a small, well-specified grammar.

**Consequences**: RTAL's grammar (`PHASE_3_DSL.md`) must be versioned from day one (`# rtal-version: 1`) since real customer-authored `.rtal` files are, by design, meant to be committed to version control and to outlive any one grammar revision.

---

## ADR-005: Compile to Rego, Evaluate on OPA

**Context**: This is an existing decision (predates this transformation program), recorded here because it remains foundational to everything this program builds on top of it, and had not previously been captured as a formal ADR.

**Decision**: Every authoring surface — including this program's new Authority Model promotion path and RTAL — compiles to Rego and is evaluated by OPA, unchanged. No new execution engine, no OPA replacement, no execution-abstraction layer, are introduced by this program.

**Alternatives considered** (as they applied when this decision was originally made, and remain true today): *A custom rules engine purpose-built for this platform's condition language.* Rejected then and now: OPA is already domain-agnostic by construction (confirmed directly this engagement — `domain/decision/engine.py` has never referenced a financial field by name), already proven at the scale this platform needs, and not the bottleneck anywhere in the current architecture. Building a replacement would be solving a problem that doesn't exist, exactly the reasoning `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8 applies to the same idea when the current transformation request raised it again.

**Consequences**: `HttpOpaClient` remains the single, narrow seam every OPA interaction goes through. If a future execution backend is ever genuinely warranted, that seam is where an abstraction would be introduced — but only once there's a second real backend to abstract to, not speculatively (the same discipline `DOMAIN_REFACTOR_PLAN.md` item 10 already applies to its own, differently-motivated adapter-registry decision).

---

## ADR-006: Cryptographic Evidence for Every Decision

**Context**: An existing decision, recorded here formally for the first time. PayReality's central differentiated claim is that every decision produces independently verifiable proof, not just a log entry a future admin could edit.

**Decision**: Every Decision produces a signed Evidence record (SHA-256 of canonical JSON, Ed25519-signed), immutable, verifiable by a third party holding only the published verification key, with historical-key-safe verification across key rotation. This program extends it (Phase 5: chaining, lineage) but does not change the underlying signing mechanism.

**Alternatives considered**: *A conventional append-only audit log, without cryptographic signing.* Rejected (as the original decision, reaffirmed here): a log proves what the platform's own database says happened; a signed record proves it independently of trusting the platform's own database — the entire difference between "our logs say we didn't overstep" and "here is mathematical proof we didn't," which is the platform's actual sales pitch to an auditor or insurer.

**Consequences**: Every future Evidence-touching change (Phase 5's chaining, any future field addition) must preserve verifiability of every record already signed under the current shape — an explicit `payload_version` field, introduced in Phase 5, is what makes that possible without freezing the schema forever.

---

## ADR-007: Fail-Closed Execution

**Context**: An existing decision, recorded here formally for the first time. Every code path in the Decision Engine that encounters uncertainty — no active policy, an OPA timeout, an ambiguous or malformed response — resolves to `HUMAN_REVIEW`, never to `ALLOW`.

**Decision**: Uncertainty never defaults to permission. This is enforced today at every failure branch in `domain/decision/engine.py::evaluate()`, and this program's own conflict-detection work (`scope_overlap.py`, built earlier this engagement) extends the same philosophy to compile time: an ambiguous policy set fails to compile rather than silently picking a winner.

**Alternatives considered**: *Default to ALLOW on transient errors (e.g. an OPA timeout), to avoid blocking legitimate business activity.* Rejected, both originally and as a standing constraint on this entire transformation program: this is precisely the failure mode `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8 warns against when it rejects speculative policy pre-filtering — a system that ever silently guesses toward permission, under any circumstance, has given up the one property (deterministic, provable authorization) that makes it worth building at all.

**Consequences**: Every new capability this program introduces — Runtime Authority Context enrichment, RTAL compilation, Authority Graph promotion — must itself fail closed on any ambiguity (an unresolvable delegation reference, a malformed RTAL statement, a conflicting promotion) rather than proceeding with a best guess. This is not a new constraint invented for this program; it is the existing constraint, applied consistently to everything new.
