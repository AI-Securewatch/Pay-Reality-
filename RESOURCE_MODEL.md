# Resource Model

## What a Resource is

A Resource is the thing an Operation acts on: a vendor payment, a prescription, a building permit, a blast zone, a claim, a patient record, a mine shutdown, a model deployment, an access request. PayReality does not maintain a list of what Resources exist. The organisation does.

This document distinguishes two ideas that today's `Scope` conflates under different fields, and separates a third that does not exist as a concept anywhere in the platform yet:

- **Resource Type**: the *kind* of thing (`vendor_payment`, `prescription`, `building_permit`). Today this lives inside the flat `scope.action` string (`"vendor_payment"` mixes the type in with the verb). It has no first-class representation of its own.
- **Resource Instance**: the *specific* thing (which vendor, which patient's prescription, which permit application). Today's `Scope.resource` field already exists for this and is already generic: `RUNTIME_POLICY_LANGUAGE.md` names it "the generic successor to today's finance-specific counterparty." No change needed here; it already does its job.
- **Resource Attributes**: the facts about a specific Resource Instance that Conditions evaluate (`amount`, `department`, `owner`, `riskScore`). Today's `Condition.field` is already a free-form string that can name any attribute; the gap is purely a naming convention (see "Attribute addressing" below), not a schema limitation.

## Why this needs to be first-class

Today, `scope.action = "vendor_payment"` answers "what kind of thing, and implicitly what's being done to it" in one opaque string, checked against a hardcoded set (`FinancialVocabulary.known_actions`, `domain/decision/scope_vocabulary.py::KNOWN_SCOPES`). Two consequences of this:

1. A customer cannot introduce a new Resource Type (say, "mine shutdown") without PayReality's own code changing (`KNOWN_SCOPES` is a Python `frozenset` in a source file, not data).
2. The same string has to separately encode the verb (approve vs. release vs. reject), which is why today's action names are always verb-shaped nouns ("vendor_payment" implicitly means "authorize a vendor payment"), and why a genuinely different verb over the same Resource Type ("reject a vendor payment" vs. "approve a vendor payment") has no clean representation today at all.

Splitting Resource Type out from Operation (`OPERATION_MODEL.md`) fixes both: Resource Types become customer-registered data, and any Operation can apply to any Resource Type the organisation has defined.

## Target model (planned, not yet implemented)

```
ResourceType
  key: string            # "vendor_payment", "prescription", "building_permit"
  display_name: string   # "Vendor Payment", "Prescription", "Building Permit"
  attribute_schema: ...  # optional: declared attribute names/types, for
                         # Policy Studio's condition-builder UI to offer
                         # autocomplete; never enforced by the Compiler,
                         # which stays agnostic to any specific attribute
```

A `ResourceType` is data the organisation creates (through an API or a Policy Studio screen, in a later implementation phase), not a code change. `Scope` gains a `resource_type` field, populated from this registry; `scope.action` is replaced by `scope.operation` (`OPERATION_MODEL.md`) plus `scope.resource_type`, together expressing what today's single `action` string expressed alone.

Nothing about `ConditionSet`, `Constraints`, `Effect`, or `Metadata` changes shape. This is additive to `Scope` specifically, not a new domain model.

## Attribute addressing

The directive's examples (`resource.amount`, `resource.department`, `resource.owner`, `resource.vendor.approved`, `resource.riskScore`, `resource.location`, `resource.classification`) describe a dot-prefixed naming convention for `Condition.field`, not a schema change. `Condition` is already `{field: str, operator: Operator, value}` (`domain/runtime_policy/conditions.py`); `field` has always been an arbitrary string PayReality's own code never inspects for meaning. Adopting `resource.<attribute>` as the convention for fields evaluated against a Resource Instance's own data is a naming discipline change for whoever authors policies (documented as guidance, enforced nowhere in code), not new capability the Compiler needs to grow. This is the cheapest part of this entire migration, precisely because `domain/runtime_policy/` was already built not to care.

## Resource Types are customer-defined, permanently

PayReality's own code, after this migration, should contain zero Resource Type names. Not "a longer list that covers more industries," zero. `FinancialVocabulary` (today's single, hardcoded, financial-only implementation of the `Vocabulary` protocol already used by Compiler V2) is replaced by a customer-scoped registry lookup: whichever organisation's policy is being compiled supplies its own known Resource Types and Operations, and the Compiler validates against that, not against anything PayReality shipped. Finance remains one populated registry among many, seeded at onboarding for the launch vertical, not a default baked into the platform.

## What does not change

- `Scope.principal` and `Scope.agent`: unaffected. These describe *who*, not *what*, and were already generic.
- `Scope.resource` (the specific instance): unaffected, already generic, already named as the intended generalization of "counterparty."
- `ConditionSet`/`Condition`: unaffected. Already domain-agnostic by construction.
- `Constraints`, `Effect`, `Metadata`: unaffected.
- Compiler V2's Rego generation mechanics (`rego_generator.py`): unaffected. It already generates Rego from `{field, operator, value}` triples mechanically; it will generate identical Rego whether `field` is `"amount"` or `"resource.amount"`, and whether the policy governs a vendor payment or a blast zone.

See `MIGRATION_PLAN_V4.md` for the phased, backward-compatible sequence that introduces `resource_type` without breaking any currently-active policy, bundle, or API contract.
