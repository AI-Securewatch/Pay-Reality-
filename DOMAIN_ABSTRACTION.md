# Domain Abstraction

This document is analysis and target-state design, not a record of changes made. Nothing in the running system changed as a result of writing this. See `DOMAIN_REFACTOR_PLAN.md` for the itemized, sequenced plan to actually get from here to there, if and when that work is prioritized.

The premise, stated plainly: Financial Services is the company's only go-to-market focus and stays that way. This document is about whether the *engine underneath* the financial product would need to be rebuilt to serve a second domain later, and the answer is: partly. Some of it already wouldn't. Some of it genuinely would, and this document says exactly which parts and why.

## Current architecture: what's already generic versus what isn't

The honest finding first: this codebase is not "a domain-agnostic engine with a thin financial skin." It's closer to "a domain-agnostic decision-evaluation shell (`domain/decision/engine.py` and OPA itself) wrapped by a financial-specific everything-else." The financial assumptions are deeper than field names in a few places, most importantly the compiler.

### Classification: every location where financial concepts appear

| Location | What it does | Classification | Why |
|---|---|---|---|
| `domain/decision/engine.py` | Orchestrates policy lookup + OPA query + outcome interpretation | **Core** | `intent` and `context` are already typed as opaque `dict[str, Any]`. This module never references `amount`, `currency`, or any financial field by name. It is, today, exactly as domain-agnostic as it needs to be. |
| OPA itself (the evaluator) | Evaluates whatever Rego + data it's given | **Core** | A general-purpose policy engine by construction. Nothing to change. |
| Decision outcome vocabulary (`ALLOW`/`DENY`/`HUMAN_REVIEW`) and fail-closed semantics | The three-outcome contract and "anything uncertain resolves to HUMAN_REVIEW" | **Core** | Domain-independent by design; this is the product's central invariant regardless of what's being authorized. |
| `domain/evidence/signing.py` | Canonicalizes and ED25519-signs an arbitrary dict payload | **Core** | Signs whatever payload dict it's handed; has no concept of amount or currency. |
| Certificate/Agent signature auth (`domain/auth/signature.py`) | Verifies a request signature against a stored public key | **Core** | Identity and replay-protection concepts, not financial ones. |
| Policy activation/versioning mechanics (exactly-one-active-policy constraint, `bundle_hash`) | Lifecycle and integrity guarantees for a compiled policy | **Core** | Generic to "a versioned, compiled ruleset," not to what the ruleset says. |
| The five-primitive relational shape (Principal → Authority → Policy → Decision → Evidence) | The schema's backbone | **Core** | Generic delegation-of-authority modeling; nothing here assumes money. |
| `Intent.amount`, `Intent.currency`, `Intent.counterparty` (dedicated typed DB columns) | Stores the specifics of a requested action | **Financial Adapter** | `Intent` already has a `context: JSONB` column for exactly this kind of variable-shape data (see `ARCHITECTURE.md`'s own reasoning for why `context` exists); amount/currency/counterparty were pulled out into dedicated typed columns instead of living there. That's a financial-specific schema decision, not a structural necessity. |
| `Authority.limit_amount`, `Authority.currency`, `Authority.extracted_limit_amount`, `Authority.extracted_currency` | The delegated limit a human approved | **Financial Adapter** | Same pattern: a dollar-limit-and-currency shape is one possible Authority Constraint shape, not the only one a Principal's delegated authority could take. |
| `Mandate.max_amount`, `Mandate.currency`, `Mandate.review_threshold` | The compiled, machine-evaluable form of an Authority | **Financial Adapter** | Directly downstream of the above; same reasoning. |
| `SubmitIntentRequest` (`schemas/intent.py`): `amount: float`, `currency: str` as required top-level API fields | The public request shape for `POST /v1/intents` | **Financial Adapter, but also the public API surface** | This is the one that matters most for "no breaking changes": external callers (today, only this app's own frontend) depend on this exact shape. Any change here must be additive, not a rename. See the refactor plan's risk notes. |
| `intent_service.submit_intent()`'s signature (`amount: float, currency: str, counterparty: str | None` as named parameters) and its construction of the OPA input (`intent={"action": action, "amount": amount, "currency": currency}`) | Builds what actually gets sent to the (domain-agnostic) engine | **Financial Adapter** | This is the actual seam where a financial-shaped dict gets constructed and handed to the otherwise-generic engine. The engine doesn't care what's in the dict; this function is what currently decides it's always `{action, amount, currency}`. |
| `intent_service._classify_risk(amount)` | Dollar-amount risk banding (LOW/MEDIUM/HIGH/CRITICAL) for every Evidence record | **Financial Adapter** | A financial risk heuristic, called unconditionally regardless of what the underlying action represents. |
| `intent_service._build_evidence_payload()`: hardcodes `"amount": str(amount)` as a named Evidence field | Builds the dict that gets cryptographically signed | **Financial Adapter, with a caveat** | The Evidence *envelope* (`decision_id`, `agent_id`, `action`, `matched_mandate_ids`, `authority_outcome`, `approval_outcome`, `recorded_at`) is generic. The `amount`/`risk_classification` fields inside it are financial-specific and hardcoded into the same function that builds the generic envelope. See the refactor plan for why this one needs care (signed historical Evidence has this shape baked in). |
| `compiler.py`'s `REGO_TEMPLATE` | The single, fixed Rego policy compiled for every Policy version | **Financial Adapter, and the deepest coupling in the system** | This is not a naming issue. The template hardcodes the actual *rule shape*: `input.intent.amount <= m.max_amount`, `input.intent.currency == m.currency`, a review-threshold band. A hypothetical non-financial Authority (e.g., "which record categories can this agent access") cannot be expressed through this template at all today, not because of a field name, but because the logic itself only knows how to compare numeric amounts against a currency-qualified limit. |
| `compiler.py::_check_conflicts()` | Detects unresolvable Authority conflicts at compile time | **Financial Adapter** | Specifically keyed on "two Authorities for the same (principal, scope) with different `max_amount`." A different domain's Authority might conflict on entirely different grounds. |
| `compiler.py::_parse_conditions()`'s `DUAL_APPROVAL_PATTERN` | Recognizes `requires_dual_approval_above_N` as a condition | **Financial Adapter** | One specific financial dual-control vocabulary, hardcoded as the only recognized condition shape (anything else becomes an opaque, non-machine-evaluable "custom" constraint). |
| `scope_vocabulary.py`'s `KNOWN_SCOPES` (`vendor_payment`, `purchase_order_create`, `wire_transfer`) | The fixed, closed vocabulary of recognized actions | **Split: the pattern is Core, the content is Financial Adapter** | The docstring's own reasoning ("a fixed enumeration, a schema change not a runtime config change, so an unrecognized action always fails to HUMAN_REVIEW") is a sound, domain-independent *mechanism*. The actual three financial scope names are what's domain-specific. |
| `domain/extraction/provider.py`'s `CandidateAuthority` dataclass, and both extraction providers (`claude_provider.py`, `fake_provider.py`) | What a document-extraction pass produces | **Financial Adapter** | Shaped specifically as "who can pay how much, under what conditions." A different domain's document intelligence would extract structurally different candidates. |
| Frontend `LiveTestIntent.tsx`: its own hardcoded `KNOWN_SCOPES` array, amount/currency inputs, hardcoded `counterparty: "vendor_772"` | The Runtime Decisions test page | **Financial Adapter (frontend), plus an existing drift bug** | Worth noting regardless of the domain-abstraction question: this array is a second, independently-maintained copy of the backend's vocabulary. They can silently drift today. See the refactor plan. |
| Frontend placeholder copy (`LiveAgents.tsx`'s "Regional Controller (EMEA)", limit-amount displays) | UI labels and placeholders | **Correctly financial, not a problem** | This is exactly what "keep financial language at the edge" means. No change indicated. |
| `PRODUCT.md`, website/investor messaging, demo flow | Positioning and GTM | **Explicitly out of scope** | Per this directive's own instruction. Not touched, not analyzed further here. |

### Why the Runtime Authority Engine can become industry-independent

Three things make this tractable rather than a rebuild:

1. **The hardest part is already done.** `domain/decision/engine.py`, the actual orchestration loop that every Intent flows through, is already domain-agnostic. It was built this way from the start (its own docstring calls it "pure orchestration"), not as a byproduct of this analysis. The work is not "make the engine generic," it's "stop building financial-shaped inputs to hand it and stop assuming a financial-shaped Rego template downstream."
2. **The schema already has the right escape hatches, just unused for these fields.** `Intent.context` and `Authority.conditions` are already flexible JSONB columns specifically intended for "genuinely variable-shape data" (this is stated directly in `ARCHITECTURE.md`). Amount, currency, and counterparty could live there today; they were pulled into dedicated typed columns instead, which is a reasonable choice for a single-domain MVP (typed columns are easier to query, index, and validate) but is exactly the choice that needs revisiting for multi-domain support.
3. **OPA itself was always the right choice for this, independent of domain.** Rego evaluating structured input against structured data doesn't care whether the data represents dollar limits or access-scope lists. The compiler choosing to always emit one specific template is a compiler decision, not an OPA limitation.

### Target architecture: the adapter model

```
                    ┌─────────────────────────────┐
                    │      Frontend (per domain)    │
                    │  speaks the customer's language │
                    │  "Vendor Payment", "Wire Transfer"│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      Domain Adapter            │
                    │      (Financial, today's only) │
                    │                                  │
                    │  - action vocabulary            │
                    │  - Intent payload shape          │
                    │  - Authority/Mandate constraint  │
                    │    shape                          │
                    │  - Rego template for that shape  │
                    │  - conflict-detection rule       │
                    │  - risk-classification heuristic │
                    │  - Evidence domain-fields shape  │
                    │  - document-extraction mapping   │
                    └──────────────┬──────────────┘
                                   │ opaque intent/context dicts,
                                   │ opaque mandate data, compiled Rego
                    ┌──────────────▼──────────────┐
                    │   Runtime Authority Engine      │
                    │   (unchanged regardless of      │
                    │    adapter)                       │
                    │                                  │
                    │  - policy lookup                │
                    │  - OPA query                     │
                    │  - ALLOW/DENY/HUMAN_REVIEW        │
                    │    interpretation, fail-closed   │
                    │  - Evidence envelope + signing    │
                    │  - Policy versioning/activation  │
                    └─────────────────────────────┘
```

A **Domain Adapter** is the seam between "what a customer's document/action/limit looks like" and "the opaque dicts the engine actually evaluates." Concretely, an adapter owns:

- **The action vocabulary.** Today: `vendor_payment`, `purchase_order_create`, `wire_transfer`. A hypothetical Identity adapter might have `grant_access`, `revoke_access`, `elevate_privilege`. The *mechanism* (fixed enumeration, unrecognized action fails to `HUMAN_REVIEW`) stays exactly as it is in `scope_vocabulary.py` today; only the content is adapter-supplied.
- **The Intent payload shape.** Financial: amount, currency, counterparty. A Contracts adapter: contract_id, clause_reference, counterparty_org. This is what currently lives in `intent_service.submit_intent()`'s parameter list and hardcoded OPA-input construction; in the target state, an adapter defines and validates this shape, and it's carried in `Intent.context` rather than dedicated columns (or the API accepts a generic payload object that the active adapter validates against its own schema, see the refactor plan's phasing on this).
- **The Authority/Mandate constraint shape**, and correspondingly **the Rego template** that evaluates it. This is the deepest piece: each adapter supplies its own Rego (or Rego-generation logic), so the compiler's job becomes "invoke the active adapter's compile step," not "always emit `REGO_TEMPLATE`."
- **The conflict-detection rule** for compile-time Authority conflicts (financial: differing `max_amount` for the same principal/scope; a different adapter might conflict on entirely different grounds, or have no equivalent concept at all).
- **The risk-classification heuristic** used when building Evidence (financial: dollar bands; a different adapter might classify risk by privilege tier, data sensitivity, or not at all).
- **The Evidence domain-specific fields**, layered on top of the generic Evidence envelope the engine already builds (`decision_id`, `agent_id`, `action`, `matched_mandate_ids`, `authority_outcome`, `approval_outcome`, `recorded_at`).
- **The document-extraction mapping**: what an AI extraction pass over an uploaded document is looking for and how it maps into that adapter's Authority shape.

The engine's job, unchanged: given an opaque intent, opaque context, and whatever's compiled into OPA, produce `ALLOW`/`DENY`/`HUMAN_REVIEW` and sign the result. It already doesn't know or care what "amount" means. The work is entirely on the side of *stopping other layers from assuming there's only ever one adapter*.

### Runtime model

At request time, nothing changes about the actual data flow already described in `ARCHITECTURE.md`'s "Runtime Authority pipeline" section, Onboarding → Human review → Compilation → Activation → Decision → Evidence → Assurance. What changes is *who owns the shape* of the data moving through each stage:

- Today: the shape is hardcoded once, implicitly, spread across `intent_service.py`, `compiler.py`, and the DB schema.
- Target: the shape is owned by whichever adapter is active for a given Policy/Principal, and the engine, compiler-orchestration, and Evidence envelope stay fixed.

A single deployment could, in principle, run more than one adapter at once (e.g., a Financial adapter and an Insurance adapter, each with their own Policy lineage), since Policy is already versioned and scoped; that's a Series A / multi-tenant concern more than a domain-abstraction one, and isn't assumed or required by this design.

### Example future adapters (illustrative only, not committed to)

- **Insurance**: Authority shaped as "which claim categories, up to what payout, can this agent approve." Rego comparing claim amount against a payout ceiling, similar shape to Financial's but a different vocabulary and likely different conflict rules (e.g., policy-type-specific caps).
- **Identity**: Authority shaped as "which systems/roles can this agent grant or revoke access to." No amount/currency concept at all; the Rego would compare a requested permission against a whitelist of grantable scopes, not a numeric limit.
- **Contracts**: Authority shaped as "which clause types, up to what commitment value, can this agent agree to on the company's behalf." Closer to Financial's numeric-limit shape, but the Evidence would need contract-identifier fields Financial doesn't have.
- **Procurement**: Authority shaped as "which vendor categories, up to what order value." Close enough to today's Financial adapter that it might reasonably start as a variant of it rather than a wholly separate adapter, a sign that "Financial" as currently scoped may already be closer to "Procurement/Payments" than to all of finance, worth keeping in mind for the GTM conversation even though this document doesn't touch GTM itself.
- **Infrastructure**: Authority shaped as "which resource types, up to what provisioned cost, can this agent create." A blend of a numeric limit (cost) and a categorical whitelist (resource type), which is a useful test case for whether the adapter interface as designed here is actually flexible enough, worth prototyping conceptually before committing to the interface shape in the refactor plan.
- **Healthcare**: Authority shaped as "which patient record categories can this agent access, under what consent scope." No numeric limit at all; this is the adapter that most stresses whether the "amount/currency" assumption has really been fully removed from the engine and compiler, a good acid test for whether the abstraction is real or superficial.

### Migration strategy, in outline

Full sequencing, effort, and risk per change lives in `DOMAIN_REFACTOR_PLAN.md`. In outline, the strategy is strangler-fig, not a rewrite:

1. Introduce the adapter module boundary (e.g. `server/app/domain/adapters/financial/`) and move today's exact logic into it, unchanged, behind an explicit interface. Zero behavior change; this is pure extraction.
2. Make the compiler call the active adapter's compile step instead of using `REGO_TEMPLATE` directly, with the Financial adapter as the only registered adapter and its compile step producing byte-identical output to today's `REGO_TEMPLATE`. Verify via the existing compiler unit tests plus a new one asserting identical `bundle_hash` before and after.
3. Move `Intent.amount`/`currency`/`counterparty` and `Authority`/`Mandate`'s equivalent fields into the existing JSONB columns, with the Financial adapter responsible for validating their presence and shape. This is the riskiest step (see the refactor plan) and should be done as its own isolated change, not bundled with step 2.
4. Only after 1-3 are live and verified with zero regression: register a second adapter (even a toy/internal one) as the real test of whether the interface holds up, before ever building a customer-facing second domain.

### Risk assessment, summary

The full per-item risk lives in the refactor plan. At the architecture level, the risks worth naming here:

- **Evidence backward-compatibility.** Every Evidence record ever signed has today's exact payload shape (`amount` as a named field, dollar-based `risk_classification`). Any change to what gets signed must either version the Evidence payload schema explicitly or ensure old and new shapes can both still be verified against the published key, since Evidence is meant to be a permanent, auditable record, not something that gets silently reshaped underneath already-issued signatures.
- **API breaking changes.** `SubmitIntentRequest`'s `amount`/`currency` are required top-level fields on a public endpoint. This directive is explicit that no breaking API changes are acceptable; any move toward a generic payload must be additive (new optional generic field alongside the existing required ones, not a replacement) until there's a deliberate, separately-decided API version bump.
- **The compiler is the load-bearing wall.** `REGO_TEMPLATE` and `bundle_hash`'s determinism guarantee are depended on by Policy versioning, rollback (reactivating a prior version), and the audit story ("the same Authority set compiled twice produces identical output"). Changing how compilation works has to preserve that guarantee under the new adapter-based path, not just under the Financial adapter's default behavior.
- **Frontend/backend vocabulary drift already exists**, independent of this whole effort (`LiveTestIntent.tsx`'s own copy of `KNOWN_SCOPES`). Low risk, low effort, worth fixing regardless of whether any adapter work happens, since it's a pre-existing correctness bug, not something this refactor introduces.
- **Scope discipline.** The single biggest risk to this effort succeeding is scope creep, building adapter infrastructure for hypothetical domains before there's a second real customer needing one. The refactor plan is deliberately ordered so that steps 1-2 (extract the seam, make the compiler adapter-aware) are valuable on their own, as architecture hygiene, independent of whether a second adapter is ever built, while steps that only pay off with a second real domain are explicitly deferred.
