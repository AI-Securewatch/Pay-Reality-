# Runtime Policy Language

This documents `server/app/domain/runtime_policy/`, built and tested in this pass (15 new unit tests, all passing; 51/51 across the whole suite, zero existing behavior touched). It is a new, fully isolated package: nothing outside it imports it yet, and it imports nothing from the database, FastAPI, OPA, or any existing authoring code. It exists, is tested, and is not wired into anything, exactly as scoped.

## Philosophy

A policy is authored exactly once, by exactly one method, at the moment someone writes it. After that, every single thing that happens to it, review, versioning, compilation, evaluation, audit, must treat it as the same kind of object regardless of how it was written. Today, that's not true: a document-extracted Authority and a hand-authored policy would, without this, be two different shapes flowing through two different code paths that happen to converge only at the very last step (the compiler). Every difference between those two paths is a place a bug can hide, a place behavior can silently diverge, and a place "the same policy, expressed two ways" can stop meaning the same thing.

`RuntimePolicy` is the answer: one canonical, immutable, framework-agnostic value. A wizard produces one. A human typing YAML into Policy Studio produces one. An AI reading a delegation matrix produces one. A future direct API call produces one. From the moment a `RuntimePolicy` exists, nothing downstream needs to know or care which of those four happened.

## Why every authoring method converges here

Consider the alternative: if the guided wizard's output, Policy Studio's output, and AI-extracted output were each their own shape, then the compiler (`POLICY_COMPILER_V2.md`), the validator, the conflict-detector, the version-comparison tool, and the Runtime Authority Engine's eventual consumption of policy data would each need to either handle three shapes or silently only really support one. That's not a hypothetical risk, it's exactly what exists today in a smaller way: `compiler.py` only ever compiles `Authority` rows, produced by exactly one path (document upload). Adding Policy Studio without a canonical model would mean either duplicating the compiler for a second input shape, or forcing Policy Studio's output to pretend to be an `Authority` row, complete with fields (`extracted_limit_amount`, `source_page`) that make no sense for something a human typed directly. Neither is a foundation worth building on.

A canonical model means the compiler is written once, against one shape, forever, regardless of how many authoring methods eventually exist.

## What `RuntimePolicy` actually contains

Matches the specification given, organized into the modules that hold it:

- **Identity and status** (`runtime_policy.py`): `id`, `name`, `description`, `version`, `status` (`draft` → `pending_review` → `approved`/`rejected` → `compiled` → `active` → `retired`, the same lifecycle shape `Policy` already has today, applied one level down).
- **Scope** (`runtime_policy.py`'s `Scope`): `principal` and `action` (both required, a policy that doesn't say who it's for and what it governs isn't a policy), plus `agent` (optional, narrows a policy to one specific agent identity rather than every agent acting for a principal, a genuine capability today's Authority/Mandate model doesn't have) and `resource` (optional, the domain-agnostic successor to today's finance-specific `counterparty`, named exactly this way in `DOMAIN_ABSTRACTION.md`'s classification table before this package existed).
- **Conditions** (`conditions.py`): a flat `all: [...]` list, logical AND only, no OR, no nesting, no scripting, no loops, matching `POLICY_LANGUAGE_SPEC.md`'s language design exactly, and for the same reasons: keeps the language something a compiler can translate deterministically and a human can read top to bottom without mentally executing it.
- **Constraints** (`constraints.py`): `delegated_by`, `expires`, `evidence_required`, `risk_level`, properties of the policy itself rather than of any single evaluated Intent.
- **Effect** (`effects.py`): `allow`, `deny`, `require_human_review`, an explicit authoring-time declaration of intent, one per policy, a materially cleaner design than today's single fixed Rego template implicitly deciding all three outcomes for every Authority the same way (see `POLICY_COMPILER_V2.md`'s finding about what today's compiler actually enforces).
- **Metadata** (`metadata.py`'s `Metadata`): `owner`, `created_by`, `tags`, descriptive only, never affects evaluation.
- **Audit** (`metadata.py`'s `AuditTrail`): `created`, `modified`, `approved`, `deployed`, plus `modified_by`/`approved_by`/`deployed_by`, an addition beyond the literal spec: an audit trail recording only *when* something happened, not *who*, is missing the half that actually matters for an enterprise audit, and `created_by` already existing on `Metadata` was the precedent for adding it consistently to the other three events.

## Why it's immutable

Editing a `RuntimePolicy` produces a new one with an incremented `version`, never a mutation of the existing value. A policy version is a fact about what was authored and approved at a specific point in time; treating it as a row updated in place would make "what did version 3 actually say" an unanswerable question the moment version 4 exists. This mirrors `compiler.py`'s existing `CompiledAuthority`/`CompiledMandate` being frozen dataclasses for exactly the same reason, applied one layer up, at the authoring model instead of just the compiled one.

## Validation: structured, never an exception for a normal mistake

`validators.py::validate()` always returns a `ValidationResult`, a tuple of `ValidationError(field, code, message)` entries, empty when the policy is valid. It never raises for a policy that's merely wrong; an exception out of this module means a real programming error (a caller passing something that isn't a `RuntimePolicy` at all), not a mistake a policy author made. Checked: required fields, duplicate conditions, unsupported operators, operator/value type mismatches (including the Python `bool`-is-a-subclass-of-`int` gotcha, a numeric operator like `<=` must still reject a boolean value even though `isinstance(True, int)` is true, covered by its own test), invalid scope, invalid effect, and invalid metadata (empty or duplicate tags).

This module deliberately does not check whether an `action` or a condition's `field` is recognized by any particular domain adapter. That check needs the active adapter's vocabulary (`DOMAIN_ABSTRACTION.md`), which this package has no knowledge of by design, and belongs at whatever layer eventually owns adapter dispatch, not inside a framework-agnostic domain model.

## Serialization

`schema.py` provides `to_dict`/`from_dict` (a full round-trip, tested) and `canonical_json` (sorted-key, whitespace-free encoding, tested for determinism: the same policy, or two independently constructed but content-identical policies, always encode to identical bytes). This mirrors `compiler.py`'s existing `_canonical_bytes` discipline for `bundle_hash`, applied to the authoring-time object instead of the compiled one, so that hashing, storing, or diffing a `RuntimePolicy` is exactly as reproducible as compiling one already is today.

`JSON_SCHEMA` is a plain-dict JSON Schema description of the same shape, kept as documentation and a stable external contract. It is not wired to a schema-validation library; this package has zero third-party dependencies, and `validators.py`'s hand-written checks are the actual source of truth for validity, not a generic validator.

## Examples

A minimal valid policy, matching the directive's own example exactly:

```python
RuntimePolicy(
    id="rp_1",
    name="Vendor Payment",
    version=1,
    status=PolicyStatus.DRAFT,
    scope=Scope(principal="prin_1", action="vendor_payment"),
    conditions=ConditionSet(all=(
        Condition(field="amount", operator=Operator.LTE, value=100000),
        Condition(field="currency", operator=Operator.EQ, value="ZAR"),
        Condition(field="vendor.approved", operator=Operator.EQ, value=True),
    )),
    effect=Effect.ALLOW,
)
```

A policy that fails validation, and exactly what it reports back (never an exception):

```python
>>> validate(_policy(name="", version=0))
ValidationResult(errors=(
    ValidationError(field='name', code='REQUIRED_FIELD_MISSING', message='name must not be empty'),
    ValidationError(field='version', code='INVALID_VERSION', message='version must be 1 or greater'),
))
```

## Migration path

Nothing has been migrated. This section is what migrating would involve, not a record of it happening.

1. **`Authority` becomes the first real producer of `RuntimePolicy`.** Today's document-upload → extraction → human-review flow would, at its final approval step, construct a `RuntimePolicy` from the approved `Authority` instead of (or in addition to, during a transition) proceeding straight to `Mandate` compilation. This is additive: nothing about the wizard's UI or user-facing behavior changes, matching this phase's explicit constraint.
2. **The compiler (`POLICY_COMPILER_V2.md`) becomes the thing that consumes `RuntimePolicy`, not `Authority`/`CompiledAuthority` directly.** This is the actual integration point where "the Runtime Authority Engine must only consume RuntimePolicy" becomes true; it is a separate, later phase, not part of this one.
3. **Policy Studio (`POLICY_STUDIO.md`) and AI Policy Translation become the second and third producers**, once they exist; both were designed against this exact model already (see `AUTHORING_ARCHITECTURE.md`, written before this package existed and already assuming this shape).
4. **`evidence_required` and `risk_level` on `Constraints` remain unread** until a deliberate decision to wire them in. Every decision produces Evidence unconditionally today; `evidence_required=False` is a real, new capability this model makes expressible but that nothing currently honors, named explicitly rather than silently implied to already work.

None of this is scheduled or committed to by this document. It's the shape of the path, for whenever each step is actually taken.

## What was deliberately not built in this phase

Per this phase's own scope: no UI, no Monaco integration, no AI translation, no wiring into the compiler, the Decision Engine, or any router. `RuntimePolicy` exists, is tested, and is inert, on purpose.
