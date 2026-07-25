# Policy Studio

Design only, nothing here is implemented. This is the new page for Manual Policy Authoring (mode 2 of 3 in `AUTHORING_ARCHITECTURE.md`), authoring in the language defined in `POLICY_LANGUAGE_SPEC.md`, compiled by `POLICY_COMPILER_V2.md`.

## Who this is for

A policy administrator comfortable with structured text (they can read and write YAML) but who should never need to know OPA, Rego, or this system's internal schema exist. This is not a developer tool and not a no-code form; it's the middle tier between the fully guided document-upload flow (mode 1) and writing actual policy-engine code, which no authoring mode in this system should ever require.

## Placement in the navigation

Alongside the existing workflow-ordered nav (`Overview → Authority → Policy → Runtime Decisions → Evidence → Assurance`, see `ARCHITECTURE.md`), Policy Studio is a new entry point *into* the Policy stage, not a seventh top-level nav item competing with it. Concretely: the existing Policy page gains a second way in, "Upload a document" (today's only path) and "Author manually" (new), both producing the same canonical Runtime Policy and landing in the same review/version list.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Policy Studio                              [Save Draft] [Test] │
│                                                        [Compile] │
├───────────────────────────────┬────────────────────────────────┤
│                                │  Validation                     │
│   Monaco editor                │  ✓ Schema valid                 │
│   (YAML, custom language)      │  ✓ Action recognized            │
│                                │  ⚠ No conflicts detected*        │
│   name: Vendor Payment         │                                  │
│   action: vendor_payment       │  * see conflict-detection scope  │
│                                │    below, this is not a proof     │
│   conditions:                  │    of consistency                │
│     - amount <= 100000         │                                  │
│     - currency == 'ZAR'        ├────────────────────────────────┤
│     - vendor.approved == true  │  Test Policy                    │
│                                │                                  │
│                                │  Sample intent (JSON):          │
│                                │  { "action": "vendor_payment",  │
│                                │    "amount": 75000, ... }       │
│                                │                                  │
│                                │  Result: ALLOW                  │
│                                │  (matched this policy, v3)      │
├───────────────────────────────┴────────────────────────────────┤
│  Version history: v3 (current draft) · v2 (active) · v1         │
└──────────────────────────────────────────────────────────────┘
```

## Monaco integration

- **Custom language definition**, not YAML-generic or Rego. Monaco's `monaco.languages.register` plus a `Monarch` tokenizer gives real syntax highlighting for this specific grammar (`POLICY_LANGUAGE_SPEC.md`): field names, operators, string/number/boolean literals, and the reserved top-level keys (`name`, `action`, `conditions`, `language_version`) each get distinct styling, not generic YAML coloring that can't tell a valid field from a typo.
- **Diagnostics wired to the validation pipeline.** Every schema and semantic error (`POLICY_LANGUAGE_SPEC.md`'s error-reporting shape: line, column, severity, message, code) becomes a Monaco marker (`monaco.editor.setModelMarkers`), rendered as the familiar red/yellow squiggle with a hover tooltip. Validation runs on a short debounce after each keystroke (schema validation is cheap and can run client-side or on every keystroke against the backend; semantic validation, which needs the active adapter's vocabulary, is fetched once per session and cached, not re-fetched per keystroke).
- **Autocomplete**, driven by the active adapter's declared vocabulary (`POLICY_LANGUAGE_SPEC.md`'s "field vocabulary is adapter-owned" section): typing inside a `conditions` entry offers the adapter's known field names; typing after `action:` offers the adapter's known scopes (`KNOWN_SCOPES` today, per `DOMAIN_REFACTOR_PLAN.md` item 2, adapter-owned rather than hardcoded in the frontend, which also fixes the existing `LiveTestIntent.tsx` vocabulary-drift bug that plan's item 5 already flags independently of this work). Autocomplete is a direct, visible proof that the adapter boundary from `DOMAIN_ABSTRACTION.md` is doing real work, not just an internal reorganization.
- **Quick-fixes** for errors with a stable `code` (from the language spec's error shape): e.g. `SEMANTIC_UNKNOWN_FIELD` on `vendr.approved` offers "did you mean `vendor.approved`?" as a one-click fix. Not required for a first version, listed here as the natural next increment once the basic diagnostics loop is in place.

## Actions

- **Save Draft.** Persists the current text as a new Runtime Policy revision in `draft` status. Does not require passing validation (a half-written policy can be saved and returned to later), but the editor still shows live diagnostics regardless of save-ability.
- **Test Policy.** Runs the dry-run evaluation designed in `POLICY_COMPILER_V2.md` against a sample Intent the user provides (a small form for the common fields, or raw JSON for anything the active adapter's vocabulary doesn't cover with a simple form). Requires the draft to pass schema and semantic validation first; if it doesn't, Test Policy is disabled with a message pointing at the Validation panel rather than failing silently or with a generic error.
- **Compile.** Runs full validation (schema, semantic, conflict detection) and produces Rego, without activating it. This moves the Runtime Policy to `compiled` status, exactly mirroring today's `POST /v1/policies/{document_id}/compile` semantics, generalized to a manually-authored source instead of an extracted-and-approved document.
- **Deploy.** Activates the compiled Runtime Policy into the live bundle. Gated by the same operator-key authentication every other policy-mutating endpoint already requires (`SECURITY.md`), no exception for manually-authored policies. Given the directive's own framing ("enterprise policy platform, not a demo editor"), this document recommends, as a default rather than a mandate, that Deploy also require a *second* identity distinct from the Runtime Policy's author, a maker-checker pattern, mirroring the existing Authority review flow's separation between whoever extracted/drafted a candidate and whoever approved it (`review_service.py`'s `reviewer_id`). Until real human authentication exists (`VERSION_3_ROADMAP.md`), this can only be enforced as "a different named identity string was recorded," the same honest limitation `resolved_by` already has today, not a cryptographically enforced separation.

## Version history panel

Lists every revision of this Runtime Policy (see `AUTHORING_ARCHITECTURE.md`'s versioning model: version number, author, timestamp, change summary), with the currently active version marked, and a rollback action that reactivates a prior version exactly as today's whole-bundle rollback already works (`ARCHITECTURE.md`'s "reactivating a previously-retired version's id is the rollback mechanism"). Clicking any two versions shows the structural diff designed in `POLICY_COMPILER_V2.md`'s version-comparison section, not a raw text diff.

## What this page deliberately does not do

- **Does not show Rego, ever**, not even in an "advanced" or "debug" toggle. If a user needs to see the compiled Rego, that's a signal this design's validation/testing surface is insufficient, a bug to fix in the validation or dry-run experience, not a reason to add a Rego view as an escape hatch.
- **Does not let a draft skip validation to reach Compile or Deploy.** Save Draft is intentionally the only action that tolerates an invalid document; every other action enforces the pipeline in `AUTHORING_ARCHITECTURE.md`'s validation table in order.
- **Does not attempt to auto-resolve detected conflicts.** Conflict detection (bounded scope, `POLICY_COMPILER_V2.md`) surfaces the conflicting Runtime Policies to a human; auto-resolution (picking a winner, merging ranges) is exactly the kind of silent-precedence-rule the existing compiler already refuses to do (`CompilationConflictError`'s own docstring: "compilation must fail closed... never partially compiled"), and this design carries that same discipline forward rather than relaxing it for the sake of a smoother editor experience.

## Dependencies this page has on other pieces of this initiative

- `POLICY_LANGUAGE_SPEC.md`'s grammar and error-reporting shape, directly, for the editor and diagnostics.
- `POLICY_COMPILER_V2.md`'s dry-run design, directly, for Test Policy.
- `DOMAIN_REFACTOR_PLAN.md` item 2 (adapter-owned vocabulary), for autocomplete and semantic validation to have anything to validate against; without it, this page would need to hardcode the Financial adapter's fields directly into the frontend, repeating the exact drift risk that plan's item 5 already names as an existing bug.
- The operator-key auth model already in place (`server/app/security.py`), unchanged, for gating Compile/Deploy.

None of these are prerequisites in the sense of "must ship first as separate releases", they can reasonably land together as one initiative, but they are prerequisites in the sense that Policy Studio's design assumes they exist, and building this page against today's hardcoded-vocabulary, template-only compiler would mean rebuilding significant parts of it a second time once the domain-abstraction work lands anyway.
