# Phase 2: Runtime Authority Context

Status: proposed. Depends on Phase 1 (there is nothing to enrich from until the Authority Model schema exists). No production code is written or implied by this document — it describes the data flow and responsibilities a future implementation should follow.

## What this is, and what it is not

Runtime Authority Context is a new, **ephemeral, request-scoped** object built fresh for every Intent, immediately before the OPA query. It is not a replacement for `Intent` — `Intent` stays exactly as it is today: signed, immutable, minimal, stored permanently. The Context is never stored; it exists only for the duration of one decision, the same way `build_opa_input()`'s current dict is never persisted today.

It is also, deliberately, **not a policy pre-filter**. Its only job is to make more information available for a policy's *conditions* to reference — it never decides which policies OPA gets to see (that would be the policy pre-filtering/indexing idea `RUNTIME_AUTHORITY_TRANSFORMATION.md` §8 explicitly recommends against). Every currently-active policy is still evaluated, exactly as today; the Context just gives those policies richer data to condition on.

## What the Context contains

| Field | Source today | How it's resolved in the target state |
|---|---|---|
| **Intent** | `Intent` row (action, amount, currency, counterparty, context, nonce, timestamps) | Unchanged — passed through as-is, exactly as `build_opa_input()` already does |
| **Agent** | `Agent` row via `Intent.agent_id` | Unchanged |
| **Principal** | Resolved once, by name, from `Agent.acting_for_principal_id` (this session's fix to `intent_service.py`) | Unchanged mechanism; now the `Principal` row also carries org/business-unit/department/team/role (Phase 1) |
| **Delegation** | Does not exist today | New: the resolved Principal's active, non-expired `AuthorityRelationship` edges (Phase 1), specifically any inbound delegation granting the Principal authority it doesn't hold directly |
| **Organisation** | Does not reach policy matching today | New: `Principal.organization_id`, resolved to the `Organization` row |
| **Resource** | `Scope.resource` free string only | New, optional: if the Intent's implied resource resolves to a real `Resource` row (Phase 1), its `type` and `owner_principal_id` become available |
| **Operation** | `Intent.action`, matched against the fixed vocabulary | Unchanged mechanism; vocabulary itself generalized per `MIGRATION_PLAN_V4.md` Phase A (reused, not redesigned here) |
| **Risk** | Computed inline in `intent_service._classify_risk(amount)`, used only for Evidence, never for matching | New: computed the same way (or a richer heuristic later), but now also written into Context so a policy condition can reference `context.risk_level` |
| **Time** | `requested_at`, already present in `context.timestamp` per today's `build_opa_input` | Unchanged — already flows through; Phase 1's `valid_from`/`valid_to` on delegation edges use it during traversal, before the OPA query, not inside Rego |
| **Environment** | Does not exist today | New, optional: a label (e.g. `production`/`sandbox`) carried on `Agent` or `Certificate`, surfaced into Context so a policy can distinguish a test agent's actions from a real one's without a separate authorization path |
| **Business Context** | `Intent.context` (free-form JSONB) | Unchanged — this is exactly what that column has always been for; Runtime Authority Context is additive to it, not a replacement |

## How Context is assembled

A new function, conceptually `resolve_runtime_authority_context(intent, agent) -> RuntimeAuthorityContext`, called from `intent_service.submit_intent` immediately before today's `decision_engine.evaluate()` call, replacing the current two-line "resolve principal name" step with a richer resolution:

1. Resolve `Principal` from `Agent.acting_for_principal_id` (unchanged mechanism).
2. Read the Principal's `organization_id`/`business_unit_id`/`department_id`/`team_id`/`role` directly off the row (Phase 1 — no joins beyond the Principal table itself, since these are now columns on it).
3. Query active, non-expired, non-revoked `AuthorityRelationship` edges where `to_principal_id` matches this Principal (i.e., what's been delegated *to* them) — a single indexed query, not a recursive traversal, for the common case of "what do I hold via direct delegation." A recursive walk (multi-hop delegation chains) is a Phase 4 concern, not needed for every decision by default — see the note on performance below.
4. If the Intent's context names a resource by identifier (optional; most Intents today don't), resolve it against `Resource`.
5. Compute risk exactly as `_classify_risk` does today (unchanged heuristic; relocatable later per `DOMAIN_REFACTOR_PLAN.md` item 4's adapter-extraction plan, which this phase doesn't need to wait for).
6. Assemble everything into one dict, merged into the existing `context` object already passed to `build_opa_input()` — under clearly-namespaced keys (e.g. `context.authority.organization`, `context.authority.department`) so it can never collide with whatever a caller already put in `Intent.context` themselves.

## How it flows to OPA

No change to `build_opa_input()`'s call signature or to `HttpOpaClient.query()` — the enrichment happens *before* `build_opa_input()` is called, by constructing a richer `context` dict than `intent_service.submit_intent` builds today. The compiled Rego, the OPA query mechanism, and the Decision Engine's precedence logic are completely unaware anything changed — they already treat `context` as an opaque `dict[str, Any]` (confirmed in `RUNTIME_AUTHORITY_TRANSFORMATION.md` §1: `domain/decision/engine.py` "never references `amount`, `currency`, or any financial field by name"). A policy authored to condition on `context.authority.department == "Finance"` works the moment `rego_generator.py`'s existing `Condition` machinery generates `input.context.authority.department == "Finance"` — no compiler change required, since dot-path field access into `context` already works today for any field, per `rego_generator._dot_path_access`.

## Performance note: why this doesn't need to be a heavyweight resolution step

Step 3 above (direct delegation lookup) is a single indexed query — negligible cost per decision, well within the platform's existing `intent_signature_window_seconds`/OPA-timeout budget. Multi-hop delegation-chain resolution (Phase 4's "what authority reaches this agent" traversal) is **not** run on every decision by default — it's a separate, on-demand query (an admin/audit tool, or an explicit opt-in condition), not part of the hot path. If a real policy author's authoring pattern later demonstrates a genuine need for multi-hop chains to matter at decision time (not just at audit/impact-analysis time), that's an additive extension to this resolution step, made once that need is real — not designed speculatively now.

## What this phase deliberately does not include

- Any change to `Intent`'s stored shape, `Decision`, `Evidence`'s envelope, the compiler, or OPA itself.
- Multi-hop delegation-chain resolution as part of every decision (see performance note above) — that's an audit/impact-analysis capability (Phase 4), not a runtime-hot-path one.
- Any policy pre-filtering based on Context — every active policy is still evaluated by OPA, unchanged from today.
