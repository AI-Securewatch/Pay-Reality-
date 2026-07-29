# Compiler V2 Architecture

This documents `server/app/domain/compiler_v2/`, built and verified in this pass: 94/94 tests passing across the whole backend (36 pre-existing, 15 from Phase 1's `RuntimePolicy`, 36 new Compiler V2 unit tests, 7 new integration tests run against a real, locally-spun-up OPA 1.7.1 server). Every Rego construct this compiler generates was checked directly against real OPA before being relied on, not assumed from documentation, and one real bug was found and fixed that way (see below). Like Phase 1's `RuntimePolicy`, this package is fully isolated: nothing outside `compiler_v2/` imports it, and `domain/decision/engine.py`, the existing `domain/compiler/compiler.py`, every router, and the frontend are all untouched.

## Two decisions made before writing any code, both worth knowing about

**The requested operator list includes `contains` and `exists`, which don't exist in Phase 1's `Operator` enum.** Rather than silently reinterpret them away, `conditions.py`'s `Operator` enum was extended with two new members, purely additive (no existing member's value changed), and all 15 of Phase 1's existing tests were re-run immediately after to confirm zero regression before writing anything else. `true`/`false` in the requested operator list are handled as boolean *literal values* (already supported), not additional operators; `exists` is the operator that takes a boolean literal to mean "check for presence" versus "check for absence."

**"Fully replaces financial hardcoded templates" does not mean deleting today's live `domain/compiler/compiler.py`.** Nothing in this phase's scope touches the routers or `intent_service.py` that today's document-upload flow depends on, and deleting or rewiring that compiler would be a real, live production behavior change this phase explicitly excludes ("do not modify the Runtime Authority Engine"). Compiler V2 fully replaces the old template's *limitation* in its own output (every condition it's given compiles to real, evaluated Rego; nothing becomes inert metadata), built as a new, isolated package, exactly like Phase 1's `RuntimePolicy`. Wiring it in place of the old compiler is a future, separate, deliberate integration step.

## The finding this compiler exists to fix

Today's `domain/compiler/compiler.py` recognizes exactly one condition pattern (`requires_dual_approval_above_N`); every other condition an Authority carries becomes a `Constraint` row that OPA never reads. `vendor.approved == true`, this phase's own running example, would silently do nothing under today's compiler. Every condition Compiler V2 is given produces a real Rego expression; there is no path through this compiler that discards a condition silently. This is checked directly, not just claimed: `tests/unit/test_rego_generator.py` asserts the exact generated Rego for every operator, and `tests/integration/test_compiler_v2_opa.py` proves those expressions actually evaluate correctly against a real OPA server, including the case where a referenced field is entirely absent from the input.

## Pipeline

```
RuntimePolicy list
        │
        ▼
compiler_v2.compile_bundle()
        │
        ├─► runtime_policy.validators.validate() per policy (reused from Phase 1, not reimplemented)
        ├─► vocabulary checks: is the action recognized, is resource well-formed
        ├─► conflict detection (bounded, see below)
        │
        │   any error above → CompileResult(bundle=None, diagnostics=<errors>), stop here
        │
        ▼ (only if every check above passed)
rego_generator: one Rego rule per RuntimePolicy
        │
        ▼
bundle_builder: assemble every policy's rule, aggregate by effect,
                compute bundle_hash
        │
        ▼
PolicyBundle (bundle_id, version, policy ids, compiler_version,
              bundle_hash, rego_source, manifest)
```

`compile_bundle()` never raises for a normal compilation failure. Every check returns structured `CompilerError(code, message, policy_id, path)` entries inside a `CompilerDiagnostics`, the same discipline `runtime_policy/validators.py` already established in Phase 1. An exception out of this package means a genuine programming error, never "this policy has a mistake in it."

## Rego generation, and what was verified about it directly

Each `RuntimePolicy` compiles to one named Rego rule (`policy_<sanitized_id> if { <scope match>; <conditions> }`), scope-matched on action and principal (and agent/resource when the policy narrows to them), with every condition ANDed inside, matching `ConditionSet`'s own flat-AND-only semantics exactly. Every operator's translation:

| Operator | Generated Rego | Verified how |
|---|---|---|
| `<=`, `>=`, `==`, `!=`, `<`, `>` | Direct comparison: `input.intent.<field> <op> <literal>` | Confirmed a missing nested field makes the expression undefined (containing rule fails to match), not a runtime error, tested against real OPA with an intent missing the referenced field entirely. |
| `in` | `input.intent.<field> in [<list>]` | Confirmed against real OPA. |
| `contains` | `contains(input.intent.<field>, <literal>)` (Rego's substring builtin) | Confirmed against real OPA. Deliberately distinct from `in`: `in` checks "the input's value is one of these authored literals," `contains` checks "the input's own field value contains this substring," not redundant with each other. |
| `exists` | A chain of `object.get(...)` calls defaulting to `{}` at every level except the last (which defaults to `null`), compared to `null` | Confirmed against real OPA for a present field, an absent leaf field, and a completely absent top-level field in a multi-level dot-path; all three behave correctly without a runtime error. |

String, number, boolean, and list literals are rendered via `json.dumps`, not hand-built string interpolation, both for correct escaping (a value containing a literal `"` was tested explicitly) and to avoid ever formatting a user-authored value directly into generated source through anything less rigorous than a real serializer.

## Bundle assembly and Decision Engine compatibility

Multiple `allow if {...}` (or `deny`/`requires_review`) definitions for the same rule name are valid Rego and OR together automatically; this was verified directly (two independent policies, each defining their own `allow if {...}` block, correctly OR) before being used as the entire aggregation mechanism, rather than attempting any dynamic Rego metaprogramming to combine an arbitrary number of generated rules.

The output field names are a deliberate compatibility choice: `allow`, `deny`, `requires_review`, `evaluated_mandates`, `review_reason`, `deny_reason`, exactly what `domain/decision/engine.py`'s `evaluate()` already reads today. `evaluated_mandates` is not the most accurate name for what's now a list of matched *Runtime Policy* ids rather than Mandate ids, but renaming it is `engine.py`'s call to make, not this compiler's, since `engine.py` is explicitly unmodified in this phase. This is not asserted, it's proven: `tests/integration/test_compiler_v2_opa.py::test_unmodified_decision_engine_consumes_compiler_v2_output` imports `domain.decision.engine.evaluate` directly, unmodified, points it at a real OPA server loaded with a Compiler V2 bundle, and confirms correct `ALLOW`/`DENY` outcomes come out the other side, exactly the way `intent_service.py` already uses it today.

A fail-closed fallback (`deny if { count(evaluated_mandates) == 0 }`) generalizes today's `compiler.py`'s own "deny when no mandate covers this scope" behavior: if no `RuntimePolicy` in the bundle matched at all, that's an explicit deny, not silence.

## Conflict detection: broadened from the original scoping, and why that's sound

`POLICY_COMPILER_V2.md`, written before this compiler existed, scoped conflict detection to same-field-same-operator numeric collisions and same-field `==` collisions, explicitly leaving cross-field tension out of scope: "genuinely hard, SMT-solver territory." That assumption held for an unrestricted condition language. It doesn't hold for the one `RuntimePolicy` actually has: `ConditionSet` is flat-AND-only and every `Condition` names exactly one field (`conditions.py`: no `any`/OR, no nesting, no cross-field relations expressible at all). Because fields are never related to each other, whether two policies' conditions can both hold for some input decomposes *exactly* into independent per-field interval-intersection checks, not a real satisfiability search. `scope_overlap.py`'s module docstring makes this argument in full; `compiler_v2._policy_conflicts` is the only caller.

What's flagged as `CONFLICTING_POLICY_STRUCTURE` today, for any two `RuntimePolicy` entries whose scope (`principal`, `action`, and non-null `agent`/`resource`) could apply to the same real Intent:

1. **Genuine overlap** (`scope_overlap.policies_can_jointly_match`): for every field either policy constrains, is the combined constraint (both policies' bounds, equality, inequality, and `in`-set conditions on that field, intersected) satisfiable? If every touched field says yes, some real Intent could match both policies at once, regardless of whether their effects agree (see check 2 below for why "same effect" still counts). This is exact for `<=`/`>=`/`<`/`>`/`==`/`!=`/`in`; `contains`/`exists` have no interval structure to reason about and fail closed to "assume it can overlap," the same posture this compiler already takes for every other "can't actually prove this" case.
2. **Contradictory equality, kept as its own explicit rule** (`compiler_v2._has_contradictory_equality`): two `==` conditions on the same field with different values are logically *disjoint* -- check 1 correctly says they can't co-match -- but this compiler has always flagged the authoring pattern itself (splitting one concept across two policies by exact-match value, e.g. `currency == 'ZAR'` on one and `currency == 'USD'` on another, rather than one policy with an `in` list) independent of whether it's a real ambiguity. Preserved unchanged from the original implementation specifically so `test_contradictory_equality_conditions_are_detected` keeps meaning what it always meant.

Two policies with *different* effects are not treated specially: an `allow` and a `deny` that could both match the same Intent are flagged exactly like two `allow`s with different amount caps would be, since the compiler has always considered "two limits for what's nominally the same scope" ambiguous authoring regardless of effect, not specifically a runtime-safety gap (the runtime itself already resolves a genuine effect disagreement fail-closed -- `deny` wins over `allow` in `decision/engine.py` -- this check is about catching the ambiguity at author time, before it ever reaches a real decision).

Still explicitly out of scope, unchanged: three-or-more-way interactions beyond what pairwise per-field checking captures (not needed for correctness given the flat-AND language, but worth naming), and precise reasoning about `contains`/`exists` beyond the conservative "assume it can overlap."

## Dry-run: the mechanism that was actually verified, not the one first assumed

An earlier design pass (`POLICY_COMPILER_V2.md`) assumed OPA's ad hoc query endpoint accepts an inline policy/data override in the request body. Checked directly against a real OPA server before writing `dry_run.py`: it does not. The mechanism that does work, and that `dry_run.py` actually implements: rewrite the candidate bundle's `package` declaration to a unique, disposable name (`payreality.dryrun.<token>`), `PUT` it to OPA under its own policy id exactly the way the live bundle is loaded, query its own data path, then `DELETE` it. Verified end to end, not just in isolation: `test_dry_run_never_affects_the_live_bundle` loads a "live" bundle first, dry-runs an entirely different draft bundle, and confirms the live bundle's own query result is byte-for-byte unaffected, and that the throwaway policy is actually gone from OPA's loaded policy set afterward, not merely inert.

**A real bug found and fixed this way**: the disposable token (`uuid.uuid4().hex`) can start with a digit, and a Rego package path segment starting with a digit fails to parse (`illegal number format`, confirmed by reproducing the exact OPA error before fixing it). Fixed by prefixing the token with a letter. Caught by actually running the dry-run test against real OPA, not by reasoning about Rego's grammar in the abstract.

## Validation coverage against what was actually requested

| Requirement | Where | Verified |
|---|---|---|
| Reject unsupported operators | `runtime_policy.validators` (Phase 1, reused) | `test_malformed_runtime_policy_is_reported_not_raised` |
| Reject malformed conditions | Same | Same |
| Reject invalid resources | `compiler_v2._validate_policy_against_vocabulary` | `test_blank_resource_is_rejected` |
| Reject invalid actions | Same, via the injectable `Vocabulary` | `test_unrecognized_action_is_rejected`, plus `test_financial_vocabulary_matches_todays_known_scopes` cross-checking the default vocabulary directly against `scope_vocabulary.py`'s real content so it can never silently drift |
| Reject conflicting policy structures | `compiler_v2._policy_conflicts`, `scope_overlap.policies_can_jointly_match` | `test_conflicting_numeric_limits_for_same_principal_and_action_are_detected`, `test_contradictory_equality_conditions_are_detected`, `test_cross_field_conflicts_are_now_detected`, `test_disjoint_numeric_ranges_across_different_operators_do_not_conflict`, `test_overlapping_ranges_across_different_operators_do_conflict`, `test_specific_agent_disambiguates_otherwise_conflicting_policies`, `test_unscoped_agent_still_conflicts_with_a_specific_one`, `test_non_overlapping_in_sets_do_not_conflict`, `test_overlapping_in_sets_do_conflict`, `test_contains_operator_conservatively_flags_as_a_conflict` |
| Structured diagnostics, never an exception | `compiler_errors.py` throughout | Every compiler test asserts on `result.diagnostics.errors`, never a raised exception, for every failure case |
| Never silently ignore a condition | `rego_generator.py` | `generate_condition_expression` raises `ValueError` (a programming error, not a validation failure) for any `Operator` it has no case for; every enum member has one |

## What was deliberately not built in this phase

No UI, no Monaco changes, no AI translation, no wiring into `intent_service.py`, any router, or `domain/decision/engine.py`. The `Vocabulary` protocol exists and has one default implementation (`FinancialVocabulary`, mirroring today's real `scope_vocabulary.py` exactly, not a guess); no second adapter was built, matching the same discipline `DOMAIN_REFACTOR_PLAN.md` already committed to (build the seam, don't build a second domain speculatively).

## What integrating this for real would still require, named rather than implied to already work

- A decision, not made here, about when/whether `intent_service.py` starts asking Compiler V2 for a bundle instead of `domain/compiler/compiler.py`, and how `RuntimePolicy` rows get persisted and versioned (Phase 1 and this phase both operate on in-memory `RuntimePolicy`/`PolicyBundle` values; neither touches the database).
- Wiring the real `HttpOpaClient.upload_policy`/`upload_data` (today's actual live-bundle-loading path) to accept a Compiler V2 `PolicyBundle` instead of `domain/compiler/compiler.py`'s `CompilationResult`, a small adapter, not attempted here since it would mean touching the live activation path.
- A decision about `evaluated_mandates`'s name, and whether `engine.py` should ever be touched to rename it, explicitly not this phase's call to make.
