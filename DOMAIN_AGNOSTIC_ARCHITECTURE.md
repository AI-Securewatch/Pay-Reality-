# Domain-Agnostic Architecture: Current-State Audit

This is a from-the-code audit, not a restatement of intent. Every claim below was checked directly against the current repository, the same discipline `DOMAIN_ABSTRACTION.md` used for its own audit earlier in this engagement. Where this document's findings differ from that one, it is because three implementation phases (RuntimePolicy, Compiler V2, Policy Studio) and a fourth (AI Policy Builder) have been built since, and each one made a real, specific choice about how much financial coupling to carry forward.

## The headline finding: two pipelines, two different distances from the goal

PayReality currently runs two independent authorization pipelines side by side, both writing to the same live OPA `authorization` package (`POLICY_STUDIO_ARCHITECTURE.md`'s "Deploy is real" section already established this):

1. **The Authority/Mandate/legacy-Policy pipeline** (`domain/compiler/compiler.py`, `services/policy_service.py`, `db/models.py::Authority`/`Mandate`/`Policy`). This is the platform's original pipeline, built before RuntimePolicy existed.
2. **The RuntimePolicy/Compiler V2/Policy Studio pipeline** (`domain/runtime_policy/`, `domain/compiler_v2/`, `services/runtime_policy_service.py`). This is what Phases 1-3 of this engagement built.

These are not equally finance-coupled. Pipeline 2 is already domain-agnostic at the schema level; only its vocabulary is finance-specific, and that vocabulary is already isolated behind one seam. Pipeline 1 is finance-shaped in its actual database columns, and no amount of vocabulary substitution fixes that; the columns themselves would have to change.

## Pipeline 1: Authority/Mandate/legacy-Policy (schema-level coupling)

| Location | Finding |
|---|---|
| `db/models.py::Authority` | `limit_amount: Numeric(18,2)`, `currency: String(3)` are typed, finance-specific columns, not generic condition values. |
| `db/models.py::Mandate` | `max_amount: Numeric(18,2)`, `currency: String(3)`, `review_threshold: Numeric(18,2)`, same pattern. |
| `domain/compiler/compiler.py::REGO_TEMPLATE` | Generates Rego that literally references `input.intent.amount` and `input.intent.currency` as named fields (lines ~134-152 as of this audit), not a generic condition evaluator. This is the single most concrete piece of evidence that this pipeline cannot represent a Resource whose governing attribute isn't an amount-and-currency pair (a building permit's approval has no "currency"). |
| `domain/extraction/claude_provider.py` | The LLM extraction tool's `scope` field is documented as "One of: vendor_payment, purchase_order_create, wire_transfer," a hardcoded financial enumeration baked into the prompt sent to the model. |
| `domain/extraction/fake_provider.py` | Canned test/fallback output is a vendor-payment claim (`scope="vendor_payment"`, `currency="USD"`), reinforcing the same assumption at the test-fixture layer. |

This pipeline predates `DOMAIN_ABSTRACTION.md`'s own audit and was correctly identified there as the deepest coupling in the system. Nothing has changed about that finding; it remains true today. What is new in this audit is the explicit decision this creates for `MIGRATION_PLAN_V4.md`: this pipeline is not worth generalizing in place. Its Rego template and its database columns are shaped for one specific Resource attribute pair. The RuntimePolicy pipeline already replaces its function generically; the honest path is retirement, not renovation (see `MIGRATION_PLAN_V4.md` Phase D).

## Pipeline 2: RuntimePolicy/Compiler V2/Policy Studio (vocabulary-level coupling only)

| Location | Finding |
|---|---|
| `domain/runtime_policy/conditions.py::Condition` | `{field: str, operator: Operator, value}`. Already fully generic; `field` has never been restricted to a known set anywhere in this module. |
| `domain/runtime_policy/runtime_policy.py::Scope` | `{principal, action, agent, resource}`. `action` is the one field that conflates verb and Resource Type (`RESOURCE_MODEL.md`, `OPERATION_MODEL.md`); everything else is already generic. `resource` is explicitly documented as "the generic successor to today's finance-specific counterparty." |
| `domain/runtime_policy/validators.py` | Deliberately does not check whether `scope.action` or a condition's `field` are recognized by any particular vocabulary; its own docstring states this is "structural and internally-consistent well-formedness... regardless of which adapter is active." This module already assumes multiple adapters will exist. |
| `domain/compiler_v2/compiler_v2.py::Vocabulary` (Protocol) + `FinancialVocabulary` | The one, single concrete implementation of an already-injectable interface. `compile_bundle()` takes a `Vocabulary` as a parameter; nothing about `compile_bundle`'s own logic assumes `FinancialVocabulary` specifically. Swapping in a customer-scoped vocabulary is a call-site change, not a `compile_bundle` rewrite. |
| `domain/compiler_v2/rego_generator.py` | Generates Rego from `{field, operator, value}` triples via generic per-operator translation (`generate_condition_expression`). It has no knowledge of `"amount"`, `"currency"`, or any other specific field name; it would generate identical Rego for `resource.bloodType` or `resource.blastRadius`. |
| `domain/decision/scope_vocabulary.py::KNOWN_SCOPES` | The oldest, most upstream vocabulary source (`{vendor_payment, purchase_order_create, wire_transfer}`), used by `intent_service` to short-circuit an unrecognized action to `HUMAN_REVIEW` before OPA is even queried. `FinancialVocabulary` in Compiler V2 deliberately reuses this exact set (`compiler_v2.py`'s own docstring: "Today's actual KNOWN_SCOPES... reused here"), so there is currently exactly one source of truth for the financial vocabulary, not several drifting copies. That is good news for migration: there is one place to generalize, not five. |
| `domain/decision/engine.py` | Zero references to `amount`, `currency`, `vendor`, `payment`, or `wire` anywhere in the module (confirmed by direct search as part of this audit). Already fully domain-agnostic, exactly as `DOMAIN_ABSTRACTION.md` found before this phase's new work began. |

**Conclusion for Pipeline 2**: the schema, the validator, the Rego generator, and the Decision Engine are already domain-agnostic. The only thing standing between this pipeline and true universality is one class (`FinancialVocabulary`) and one field name (`Scope.action` conflating Operation and Resource Type). This is a narrow, additive, low-risk change, detailed in `MIGRATION_PLAN_V4.md` Phase A-B.

## New coupling introduced by Phase 3 and the AI Policy Builder (since the original audit)

Two new files did not exist when `DOMAIN_ABSTRACTION.md` was written, and both inherited the financial vocabulary because it was the only one available at the time:

| Location | Finding |
|---|---|
| `domain/ai_policy_builder/claude_provider.py` / `PROMPT_LIBRARY.md` | The RuntimePolicy extraction prompt's `action` field description reads "One of: {known_actions}," populated from `FINANCIAL_VOCABULARY.known_actions` at call time. This was built correctly with respect to *not hardcoding a second copy* of the vocabulary (it imports `FINANCIAL_VOCABULARY` rather than repeating the list, exactly the discipline `DOMAIN_REFACTOR_PLAN.md` item 5 asked for), but it still only ever knows the financial vocabulary, because that vocabulary is still the only one that exists. This is not a bug to fix now; it is a correct citation of the current, single vocabulary source, which is exactly why generalizing that one source (Phase B of `MIGRATION_PLAN_V4.md`) automatically fixes this file too, with no separate edit required. |
| `domain/ai_policy_builder/fake_provider.py` | Same shape as `domain/extraction/fake_provider.py`: a canned vendor-payment candidate. Same conclusion: correct today, automatically generalized once the vocabulary is. |

## Frontend and website: further ahead than the backend

`src/app/policy-studio/components/ScopeFields.tsx` already fetches its action list from `GET /v1/runtime-policies/vocabulary` at runtime rather than hardcoding a second copy (this was a deliberate fix during Phase 3, citing `DOMAIN_REFACTOR_PLAN.md` item 5 directly in its own source comment). The frontend is already structurally ready to display whatever vocabulary the backend serves; no frontend change is required to support a new vocabulary once the backend serves one.

The marketing website's actual current copy (checked directly in the `PayReality website` repository, not assumed) is further along than this directive's framing assumes: the live hero headline is "The Authority Layer for Autonomous AI," the page `<title>` is "PayReality | Enterprise AI Authority Infrastructure," and the homepage's own use-case list already spans Procurement, Insurance Claims, Finance, ERP, HR, Customer Operations, and Manufacturing. There is no live instance of the literal phrases "Financial AI," "AI Governance Platform," or "Compliance Platform" as primary positioning. `PLATFORM_POSITIONING.md` treats this honestly: the positioning gap is smaller than the architecture gap, and the real risk is the reverse of what the directive assumes, the website already gestures at multi-industry positioning the backend vocabulary doesn't yet back up.

## Summary table

| Component | Domain-agnostic today? | What's left |
|---|---|---|
| `domain/runtime_policy/` | Yes | Nothing; `Scope.action` naming is the only cosmetic gap |
| `domain/compiler_v2/` | Yes, structurally | Swap `FinancialVocabulary` for a customer-scoped registry |
| `domain/decision/engine.py` | Yes | Nothing |
| `domain/decision/scope_vocabulary.py` | No | Single source of truth; becomes the first thing generalized |
| Policy Studio (frontend) | Yes | Nothing; already vocabulary-driven |
| AI Policy Builder | Inherits vocabulary coupling, not its own | Fixed automatically once the vocabulary is |
| `domain/compiler/compiler.py` (legacy) | No | Schema-level; candidate for retirement, not refactor |
| `db/models.py::Authority`/`Mandate` (legacy) | No | Schema-level; candidate for retirement, not refactor |
| Website positioning | Mostly already there | Minor copy alignment, not a rewrite |
