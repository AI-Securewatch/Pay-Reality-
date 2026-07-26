# Universal Runtime Authority

## Mission

Evolve PayReality from a financial AI platform into a universal Runtime Authority platform, without a rewrite. The Runtime Engine, Compiler V2, OPA integration, Evidence Engine, Policy Studio, and Runtime Policies already exist and are preserved exactly as they are. What changes is what PayReality is allowed to assume: today it assumes its customers are financial institutions authorizing financial actions; tomorrow it must assume nothing about industry at all.

This document, and the five alongside it (`RESOURCE_MODEL.md`, `OPERATION_MODEL.md`, `DOMAIN_AGNOSTIC_ARCHITECTURE.md`, `MIGRATION_PLAN_V4.md`, `PLATFORM_POSITIONING.md`), are a planning phase, not an implementation. No RuntimePolicy schema, Compiler V2 code, Runtime Engine code, or production data changes as part of this phase. This mirrors exactly how `DOMAIN_ABSTRACTION.md`/`DOMAIN_REFACTOR_PLAN.md` worked earlier in this engagement: understand and plan first, refactor deliberately later, one reviewed phase at a time.

## Core principle

**PayReality must never understand industries. PayReality must only understand authority.**

Customers define their own business objects: what a Resource is, what Operations exist on it, what Conditions and Constraints govern it. PayReality's job is to compile those definitions into an enforceable, evidenced runtime decision, the same way regardless of what the Resource or Operation is actually called.

This is not a new principle invented for this phase. It is already the load-bearing idea behind `RuntimePolicy` (`RUNTIME_POLICY_LANGUAGE.md`): a `Condition` is `{field, operator, value}`, not `{amount, operator, value}`; `domain/runtime_policy/validators.py` checks structural well-formedness and explicitly refuses to check whether an action or field name is "real," by design, because that requires a vocabulary this package deliberately has no knowledge of. What this phase does is follow that principle all the way to its conclusion, instead of stopping at the RuntimePolicy boundary and leaving everything downstream (the vocabulary, the AI extraction prompts, the two-and-a-half-year-old Authority/Mandate schema, the UI copy, the website) still assuming finance.

## The mental model shift

**Today:**

```
Finance
  |
Runtime Policy
  |
Compiler
  |
OPA
  |
Evidence
```

**Target:**

```
Organisation
  |
Runtime Policy
  |
Compiler
  |
OPA
  |
Evidence
```

The organisation defines Resources, Operations, Conditions, and Constraints. PayReality provides the Runtime Policy Language, the Compiler, the Runtime Engine, Evidence, and Assurance. Nothing in that provided layer should be able to answer the question "what industry is this deployment for," because it was never asked to.

## What already satisfies this, and what does not

This phase's most important finding, detailed fully in `DOMAIN_AGNOSTIC_ARCHITECTURE.md`, is that the platform is currently split into two pipelines with very different amounts of work left to do:

- **RuntimePolicy, Compiler V2, the Decision Engine, and Policy Studio** (the pipeline built across this engagement's Phase 1-3) are already structurally domain-agnostic at the schema level. A `Condition` is a free-form `{field, operator, value}` triple; the compiler generates Rego from that triple mechanically, never inspecting what `field` means. The only finance-specific thing left in this pipeline is the *vocabulary* (the known set of action names), which is already isolated behind a single `Vocabulary` protocol (`domain/compiler_v2/compiler_v2.py`) with exactly one concrete implementation, `FinancialVocabulary`. Replacing that one class with a customer-supplied one is a narrow, well-bounded change.
- **The Authority/Mandate/legacy-Policy pipeline** (the original delegation-of-authority model this platform launched with) is finance-shaped at the database schema level: `authorities.limit_amount` and `authorities.currency` are typed columns (`Numeric(18,2)`, `String(3)`), not generic condition values, and the same is true of `mandates.max_amount`/`mandates.currency`/`mandates.review_threshold`. This is a deeper, harder coupling, and it predates RuntimePolicy entirely. `MIGRATION_PLAN_V4.md` treats this pipeline separately from the RuntimePolicy pipeline for exactly this reason: they are not equally far from the goal.

The honest headline: PayReality does not need one universal-authority migration. It needs to finish decoupling one pipeline it already mostly decoupled, and make a deliberate decision about a second, older pipeline that was never built with this principle in mind.

## Vocabulary: what PayReality's language becomes

| Today | Becomes |
|---|---|
| Financial Action | Operation + Resource |
| Payment, Invoice, Wire Transfer | (customer-defined Resource Types) |
| `scope.action = "vendor_payment"` | `scope.operation = "approve"`, `scope.resource_type = "vendor_payment"` |
| `KNOWN_SCOPES` (hardcoded) | a customer-supplied Vocabulary |

`Principal`, `Resource`, `Operation`, `Conditions`, `Constraints`, `Effects`, and `Metadata` become the entire vocabulary PayReality's own code is allowed to hardcode. Everything more specific than that (what a "vendor payment" is, what "approve" means for a building permit versus a blast zone) belongs to the customer, expressed through Resource Types, Operations, and Condition field names they define, never through code PayReality ships.

## Examples across verticals

| Industry | Operation | Resource |
|---|---|---|
| Finance | Approve | Vendor Payment |
| Healthcare | Approve | Prescription |
| Government | Approve | Building Permit |
| Mining | Release | Blast Zone |
| Insurance | Approve | Claim |

Every row compiles through the identical Runtime Policy Language, the identical Compiler V2, the identical Decision Engine, and produces the identical shape of Evidence record. The Runtime Engine treats every one of these Resources equally, because it was never told any of them were different.

## Success criteria

At the end of this migration (across all phases in `MIGRATION_PLAN_V4.md`, not this planning phase alone), it should be impossible to tell from the architecture whether a given deployment is running inside a bank, a hospital, a government department, a mining company, or a space agency. The architecture should reveal exactly one thing: this organisation has principals, resources, operations, and authority, and PayReality enforces that authority. Finance remains the launch vertical, proven first, referenced in case studies and go-to-market material. It stops being load-bearing in the architecture.
