# Phase 3: The Runtime Authority Language (RTAL)

Status: proposed. Grammar design can start in parallel with Phase 1's schema work; full expressiveness (organisation/department/delegation/time keywords) depends on Phase 1's fields existing to reference. No parser or compiler code is written here — this document is the language and compilation-target design.

## Why this language exists

Every existing authoring surface — Policy Studio's form, the AI Policy Builder, the AI Authority Builder — already produces the same internal object: a `RuntimePolicy` (`scope`, `conditions`, `effect`). What's missing is a plain-text surface for that same object: something a compliance officer can write, review, and diff in a pull request without opening a UI, something an LLM can generate reliably and round-trip, and something that reads as a sentence about delegated authority rather than a form submission or a Rego module.

RTAL is not a new runtime, a new compiler backend, or a new semantic model. **It is a fourth authoring surface targeting the exact same `RuntimePolicy` object every existing surface already produces**, and from there, the exact same `compile_bundle()` → Rego → OPA path, unchanged. A file written in RTAL and a policy typed into Policy Studio's form, if they express the same authority, compile to byte-identical Rego.

## Why enterprises will prefer it to writing Rego directly

Nobody writes Rego directly today — Policy Studio's form and the AI builders already exist specifically so nobody has to. RTAL's role is narrower and more specific than "an alternative to Rego": it's an alternative to a **UI form**, for the specific set of people and workflows a form serves badly:

- **Version control.** A form's state lives in a database row; an RTAL file lives in a Git repository, diffable, reviewable in a pull request, blamable line by line — the same review discipline an enterprise already applies to code, applied to its delegated-authority statements.
- **Bulk authoring.** Onboarding fifty principals' worth of authority via a form means fifty form submissions. Via RTAL, it's fifty declarations in one file (or one per file, in one directory), authored, reviewed, and compiled together.
- **LLM generation with a verifiable output.** An LLM asked to draft authority from a governance document today (the AI Policy Builder / AI Authority Builder) emits a structured JSON candidate a human reviews field-by-field in a UI. Asked to emit RTAL instead, the LLM produces something a human reads as a sentence and can correct with a text edit, not a form re-submission — and because RTAL's grammar is deliberately narrow (see below), a malformed or semantically-impossible statement fails to parse rather than silently becoming an incorrect policy.
- **Boundedness is the point, not a limitation.** Rego is Turing-complete-adjacent general-purpose logic programming; RTAL can express only statements shaped like "this principal can do this operation on this resource, under these conditions, with this effect." That boundedness is exactly what keeps `scope_overlap.py`'s conflict detection exact (§ below) and what keeps a compliance reviewer able to read every statement a customer has ever authored without an engineering background.

## Design requirements, and how the grammar satisfies each

| Requirement | How |
|---|---|
| Human-readable | Reads as a declarative sentence, not code — see examples |
| Machine-readable | A small, fully-specified grammar (below), unambiguous by construction |
| LLM-friendly | Flat, keyword-delimited clauses; no significant whitespace, no nested scoping rules for an LLM to get subtly wrong |
| Deterministic | One parse tree per valid input; no operator-precedence ambiguity (all clauses are keyword-prefixed, not positional) |
| Versionable | Plain UTF-8 text files (`.rtal`), one policy (or a small related group) per file, diffable in Git |
| Composable | A file may declare a named `resource`/`principal-group` once and reference it from multiple policy statements in the same or another file |
| Auditable | Every clause maps to exactly one field on `Scope`/`Condition`/`Effect` — nothing is implicit, nothing is inferred silently |

## Grammar

```ebnf
policy        ::= "policy" identifier ":" NEWLINE INDENT statement+ DEDENT
statement     ::= principal_clause
                 | operation_clause
                 | resource_clause
                 | org_clause
                 | delegation_clause
                 | time_clause
                 | condition_clause
                 | escalation_clause
                 | effect_clause

principal_clause  ::= "principal" identifier
delegation_clause ::= "delegated_from" identifier
operation_clause  ::= "can" identifier
resource_clause   ::= "on" identifier
org_clause        ::= ("within" | "region" | "organisation") identifier

time_clause       ::= "valid" "from" timestamp "to" timestamp
                     | "expires" timestamp

condition_clause  ::= "when" condition ("," condition)*
condition         ::= field_path comparator value
field_path        ::= identifier ("." identifier)*
comparator        ::= "<=" | ">=" | "==" | "!=" | "<" | ">" | "in" | "contains" | "exists"

escalation_clause ::= "escalate_to" identifier "above" number
                     | "requires_review" "above" number

effect_clause     ::= "allow" | "deny" | "review"

identifier ::= letter (letter | digit | "_")*
number     ::= digit+ ("." digit+)?
timestamp  ::= ISO-8601 date or datetime literal
value      ::= number | quoted_string | identifier | "[" value ("," value)* "]"
```

Indentation-delimited blocks (Python-like) rather than braces, to read as plainly as possible and to be the least error-prone shape for an LLM to generate consistently.

## Compilation target

Each `policy` block compiles directly to one `RuntimePolicy`:

| RTAL clause | `RuntimePolicy` field |
|---|---|
| `principal <id>` | `scope.principal` |
| `can <id>` | `scope.action` (or `scope.operation` once `MIGRATION_PLAN_V4.md` Phase B lands) |
| `on <id>` | `scope.resource` |
| `within` / `region` / `organisation <id>` | additive `Condition`s against `context.authority.department` / `context.authority.region` / `context.authority.organization` (Phase 2's enriched context — see `PHASE_2_RUNTIME_CONTEXT.md`) |
| `when <field> <op> <value>` | a `Condition` in `ConditionSet.all`, one-to-one, using exactly today's `Operator` enum |
| `escalate_to <id> above <n>` / `requires_review above <n>` | a second `RuntimePolicy` (same scope, `effect: require_human_review`, condition `amount > n`) — one RTAL block may compile to more than one `RuntimePolicy` when it expresses a tiered outcome, exactly the way an author using Policy Studio today would have to write two separate policies for the same |
| `valid from <t1> to <t2>` / `expires <t2>` | a `Condition` on `context.timestamp` (Phase 2 — this timestamp already flows into every OPA input today) |
| `allow` / `deny` / `review` | `effect` |
| `delegated_from <id>` | not a `RuntimePolicy` field at all — resolves against Phase 1's `AuthorityRelationship` table; a delegation-sourced principal reference is validated (does an active, non-expired, non-revoked delegation edge actually exist?) at compile time, not silently trusted |

This mapping is exhaustive — every RTAL construct has exactly one destination in the existing model. There is no RTAL feature this table doesn't cover, by design: if a future need requires a feature this table can't express, that's a deliberate, reviewed grammar extension, not a silent gap.

## Examples

**Basic — the request's own example, formalized:**
```
policy vendor_payments_standard_limit:
    principal RegionalController
    can vendor_payment
    on VendorInvoice
    within Finance
    region EMEA
    when amount <= 50000
    allow
```

**Tiered outcome — allow under a limit, escalate above it:**
```
policy vendor_payments_with_escalation:
    principal RegionalController
    can vendor_payment
    on VendorInvoice
    within Finance
    when amount <= 50000
    allow

policy vendor_payments_escalation_tier:
    principal RegionalController
    can vendor_payment
    on VendorInvoice
    within Finance
    when amount > 50000
    review
```

**Delegation:**
```
policy deputy_controller_delegation:
    principal DeputyController
    delegated_from RegionalController
    can vendor_payment
    on VendorInvoice
    within Finance
    when amount <= 25000
    allow
```

**Temporary authority (e.g. covering leave):**
```
policy temporary_cover_q1:
    principal ActingController
    delegated_from RegionalController
    can vendor_payment
    on VendorInvoice
    within Finance
    valid from 2026-01-05 to 2026-01-20
    when amount <= 50000
    allow
```

**Risk-based condition, using Phase 2's enriched context:**
```
policy high_risk_requires_review:
    principal RegionalController
    can wire_transfer
    on VendorInvoice
    when context.risk_level == "high"
    review
```

**Cross-organisation authority (explicit, never implicit — Phase 1's `cross_org_approved` flag):**
```
policy shared_services_cross_org:
    principal SharedServicesController
    delegated_from GroupTreasurer
    can vendor_payment
    on VendorInvoice
    organisation Subsidiary
    when amount <= 10000
    allow
```

## Versioning

RTAL files are versioned the same way every other artifact in this codebase already is: by the `RuntimePolicy` they compile to. Editing an `.rtal` file and recompiling produces a new `RuntimePolicyRecord` version, exactly as editing a policy through Policy Studio's form does today — never a mutation of a prior version. A grammar version tag (`# rtal-version: 1`) at the top of each file is recommended from day one, so a future grammar revision (v2) can coexist with v1 files during a migration window, the same additive discipline this entire program applies everywhere else.

## What this phase deliberately does not include

- A new compiler backend. RTAL parses to `RuntimePolicy`; `compile_bundle()`, `rego_generator.py`, and OPA are completely unaware RTAL exists.
- General-purpose expressions, loops, functions, or user-defined logic of any kind — RTAL expresses only "this principal can do this, under these conditions, with this effect," on purpose (see "boundedness is the point," above).
- A visual/graphical editor for RTAL in this phase — a plain-text editor with syntax highlighting (a small, mechanical addition to whatever the team's existing editor tooling is) is sufficient for v1; a dedicated authoring UI is a Phase 6 platform capability, not a Phase 3 requirement.
