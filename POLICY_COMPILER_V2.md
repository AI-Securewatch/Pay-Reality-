# Policy Compiler V2

Design only, nothing here is implemented. This is the compiler that turns a Runtime Policy (`AUTHORING_ARCHITECTURE.md`), authored in the language defined in `POLICY_LANGUAGE_SPEC.md`, into Rego that OPA can evaluate, and that supports the validation pipeline (dry-run, conflict detection, version comparison) sitting in front of deployment.

## The finding this whole document is built around

Today's compiler (`server/app/domain/compiler/compiler.py`) does not compile conditions into Rego. It parses exactly one recognized pattern, `requires_dual_approval_above_N`, into a numeric `review_threshold` field on the compiled Mandate, which the one fixed `REGO_TEMPLATE` then reads. Every other condition an Authority might carry becomes a `Constraint` row of `type: "custom"`, stored in the database, and never read by the Rego template at all. It is persisted metadata, not an enforced rule.

This matters enormously for scoping this work honestly: `vendor.approved == true` in the directive's own example is exactly the kind of condition that would silently do nothing under today's compiler, stored but never evaluated, with no error or warning that it wasn't enforced. Building a real condition language that a human can trust to actually be enforced requires building real expression-to-Rego compilation. That is new capability, not a refactor of existing capability, and it is the single largest piece of net-new engineering this initiative requires. Nothing else in this document matters if this point gets scoped as "already basically works."

## Compiler pipeline

```
Runtime Policy (one, from any authoring mode)
        │
        ▼
  Parse & validate           (schema + semantic, POLICY_LANGUAGE_SPEC.md)
        │
        ▼
  Condition AST                 a structured tree, not a string, per condition
        │
        ▼
  Rego fragment generation     one Rego expression per condition
        │
        ▼
  Mandate assembly              combine this Runtime Policy's compiled fragments
        │                        into one Mandate-equivalent rule, generalizing
        │                        today's per-Mandate max_amount/currency/
        │                        review_threshold fields
        ▼
  Bundle assembly                combine every approved Runtime Policy's compiled
        │                        Mandate into one Rego module + mandates_data,
        │                        exactly as compile_authorities() does today
        ▼
  bundle_hash                     sha256 over canonical (rego, mandates_data),
                                  identical determinism guarantee to today
```

### Condition AST, conceptually

Each condition (`amount <= 100000`) parses into a small structured node, not a string:

```
{ "field": "amount", "op": "<=", "value": 100000, "value_type": "number" }
{ "field": "currency", "op": "==", "value": "ZAR", "value_type": "string" }
{ "field": "vendor.approved", "op": "==", "value": true, "value_type": "boolean" }
```

This is what both Rego generation and conflict detection operate on, never the raw text. Parsing to an AST once, at save time, and validating the AST (not re-parsing text at every downstream step) is what keeps schema/semantic validation, Rego generation, and conflict detection all working from one agreed-upon shape.

### Rego fragment generation

Each AST node maps to one Rego comparison, using the field's dot-path directly against `input.intent` (or, for adapter-declared context fields, `input.context`), for example:

```rego
input.intent.amount <= 100000
input.intent.currency == "ZAR"
input.context.vendor.approved == true
```

All of a Runtime Policy's conditions are joined with Rego's implicit AND (multiple expressions inside one `if { ... }` block), matching the language's own flat-AND-list semantics from `POLICY_LANGUAGE_SPEC.md`. This generalizes today's fixed three-line `allow if { ... }` block in `REGO_TEMPLATE` into a per-Runtime-Policy generated block, assembled into the same overall `matching_mandate` / `allow` / `deny` / `requires_review` structure the current template already uses, so the runtime shape OPA actually evaluates doesn't need to change, only how much of it is templated versus generated.

### Determinism

The existing guarantee (`compiler.py`'s own docstring: "the same approved Authority set, compiled twice, must produce byte-identical Rego and an identical bundle_hash") must hold under V2 exactly as it holds today. Concretely: AST nodes must be serialized in a canonical, sorted order before Rego generation and before hashing (matching the existing `_canonical_bytes` sorted-keys approach), and Rego fragment generation must be a pure function of the AST with no non-deterministic ordering (e.g. dict iteration order) anywhere in the pipeline. This needs its own explicit test (compile the same Runtime Policy set twice, assert identical `rego_source` and `bundle_hash`), not an assumption carried over from the old compiler's tests, since the new code path is different enough to warrant its own direct proof.

## Dry-run evaluation

This does not exist in any form today. OPA, as deployed, only ever holds one thing: the currently active bundle's compiled Rego and `data.mandates`, loaded via `HttpOpaClient.upload_policy`/`upload_data`. There is no path today to ask "what would this *draft*, not-yet-active policy decide for this sample Intent" without overwriting the live active bundle, which would be unacceptable, even briefly, in production.

### Design: ad hoc query, not data upload

OPA supports evaluating a Rego query directly against an explicit, request-scoped input and data payload (an ad hoc evaluation, distinct from its "loaded policy, queried via `data.*`" mode already in use for real traffic). The dry-run path should use this ad hoc mode specifically so it never touches `data.mandates` or any policy path the live traffic depends on:

```
POST {OPA_URL}/v1/query
{
  "query": "data.payreality.authorization.allow",
  "input": { <sample intent/context/agent, exactly the shape build_opa_input() 
              already constructs today> },
  "data": { "mandates": [ <only this draft Runtime Policy's compiled Mandate,
                            not the live active bundle's> ] }
}
```

This runs through the same embedded OPA process already deployed (see `DEPLOYMENT.md`'s zero-cost topology), with zero risk to the live bundle, since the query supplies its own scoped `data` rather than reading whatever's currently loaded at `data.mandates`. No new infrastructure, no second OPA instance, just a different API call against the one already running.

### What "Test Policy" actually shows a user

Given a sample Intent (a small form or raw JSON, matching `SubmitIntentRequest`'s shape), the dry-run returns exactly what `domain/decision/engine.py` would have produced, `ALLOW`/`DENY`/`HUMAN_REVIEW` plus the reason, run through the same interpretation logic that real traffic uses, just fed from the ad hoc query's result instead of a live OPA data read. This is important: dry-run must reuse the *exact same* result-interpretation code path (`evaluate()`'s `allow`/`deny`/`requires_review` logic) as production, not a separate simulated interpreter, or the two could silently drift and a "tested" policy could behave differently once actually deployed.

## Conflict detection: honest, bounded scope

Full semantic conflict detection for arbitrary boolean conditions (does Runtime Policy A ever produce a different outcome than Runtime Policy B for some input where both would apply) is, in the general case, equivalent to a satisfiability problem: genuinely hard, SMT-solver territory, and not something to build or promise here. This document scopes what's actually practical:

**In scope for V2:**
- **Same (principal, action) pair, numerically overlapping ranges with different limits.** Today's exact check, generalized: if two approved Runtime Policies both apply to the same principal and action, and both constrain the same numeric field, flag it if their ranges overlap and their effective limits differ (e.g. two `amount` conditions for the same principal/action where one allows up to 100,000 and another up to 50,000, this is ambiguous, exactly the case `compiler.py::_check_conflicts` already detects today, generalized from "always `max_amount`" to "any numeric field two policies both constrain").
- **Same (principal, action, field) with contradictory equality conditions.** e.g. one Runtime Policy requires `currency == 'ZAR'` and another, otherwise overlapping, requires `currency == 'USD'`, for the same principal and action: flagged as a conflict, since no real Intent could ever satisfy both, meaning one of the two Runtime Policies would never actually apply, silently.

**Explicitly out of scope, named rather than silently absent:**
- Detecting conflicts across *different* fields with no direct overlap (e.g. one policy conditions on `amount`, another on `vendor.approved`, for the same principal/action: whether these are actually in tension depends on real-world semantics no compiler can know).
- Any conflict that would require reasoning about combinations of three or more conditions simultaneously (full boolean satisfiability). If this becomes a real need, it's a deliberate future scoping decision (likely: integrate an actual SMT solver, a substantial dependency and effort decision) not something to half-build here.

The validation UI (`POLICY_STUDIO.md`) must be honest with the user about this boundary: a "no conflicts detected" result means "no *detectable* conflict of the two kinds above," not "this policy is proven consistent with every other active policy." Overclaiming here would be exactly the kind of overclaiming `SECURITY.md` and `PRODUCT.md` have both been deliberately careful to avoid elsewhere in this project.

## Version comparison

A structural diff, not a text diff, comparing two Runtime Policy versions (or two whole Policy Bundle versions) at the AST level: which conditions were added, removed, or had their operator/value changed; whether the action changed; whether the principal changed. Rendered to a human reviewer before Deploy as a readable summary ("changed `amount <= 100000` to `amount <= 150000`"), not a raw JSON or Rego diff, since the reviewer approving a change should never need to read generated Rego to understand what they're approving, the same "never expose Rego" principle from `POLICY_LANGUAGE_SPEC.md` applies here too.

## Relationship to `DOMAIN_REFACTOR_PLAN.md`

This document supersedes and substantially expands `DOMAIN_REFACTOR_PLAN.md`'s item 3 ("make the compiler adapter-aware"). That item, scoped before this directive existed, assumed the compiler would keep using one fixed template per adapter. This document's finding, that arbitrary conditions need real compilation, not template substitution, means item 3's estimated effort (originally "Medium") should be revised upward once this work is actually planned into a sequenced backlog; this document doesn't re-issue `DOMAIN_REFACTOR_PLAN.md` itself, but any future revision of that plan should reference this finding rather than carry the original, now-understated, effort estimate forward unexamined.
