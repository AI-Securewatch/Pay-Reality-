# Policy Language Specification

Design only, nothing here is implemented. This defines the language a human authors directly in Policy Studio (`POLICY_STUDIO.md`), and that the AI Policy Builder mode also targets as its extraction output before human review. Neither authoring mode's user ever needs to read or write Rego; this document is what stands between them and it.

## Design goals, in priority order

1. **Never expose Rego.** A policy administrator should never need to know OPA or Rego exist.
2. **Small and boring beats expressive and clever.** This is an authorization language, not a general-purpose one. Every construct added is something a compiler has to translate correctly and something a conflict-detector has to reason about; both get harder, not easier, as the language grows. Start minimal.
3. **Every construct must be compilable to Rego deterministically**, and re-compiling the identical Runtime Policy must produce byte-identical Rego, exactly as `compiler.py`'s existing determinism guarantee requires today.
4. **Fields and actions are adapter-owned, not language-owned.** The language defines *how* to write a condition; the active domain adapter (see `DOMAIN_ABSTRACTION.md`) defines *which field names and actions are valid*. The language has no built-in knowledge that `amount` or `currency` exist.

## Surface syntax

YAML, matching the directive's own example, chosen over a bespoke text grammar because it gets free structure, free existing Monaco language support to extend rather than build from scratch, and is already the format this team is comfortable authoring config in (`render.yaml`, `docker-compose.yml`).

```yaml
language_version: 1

name: Vendor Payment
action: vendor_payment

conditions:
  - amount <= 100000
  - currency == ZAR
  - vendor.approved == true
```

### Top-level fields

| Field | Required | Type | Meaning |
|---|---|---|---|
| `language_version` | yes | integer | Which version of this spec the document was authored against. See Versioning below; this is not the same thing as the Runtime Policy's own revision number. |
| `name` | yes | string | Human-readable label, shown throughout the UI and in Evidence. Not used in compiled Rego at all. |
| `action` | yes | string | Must be a recognized scope for the active domain adapter. Semantic validation (not schema validation) rejects an unrecognized action; see `AUTHORING_ARCHITECTURE.md`'s validation table. |
| `conditions` | no (empty list is valid, meaning "no constraint beyond the action matching") | list of condition expressions | See grammar below. |
| `principal_id` / `principal_name` | no, resolved at review/approval time if omitted | string | A manually-authored policy may leave this for the reviewer to assign, exactly as document-extracted Authorities can today (`_find_or_create_principal`). |

## Condition expression grammar

A condition is a single line of the form:

```
<field> <operator> <literal>
```

No nested boolean expressions, no parentheses, no `and`/`or`/`not` keywords in version 1 of this language. Every listed condition is implicitly AND-ed together, exactly matching the directive's own example (three conditions listed, all must hold). This is a deliberate, stated limitation, not an oversight:

- It maps directly onto the shape of thing today's compiler already knows how to combine (multiple `matching_mandate` predicates ANDed in Rego's `allow if { ... }` block).
- It's sufficient for every example given in this directive and everything `DOMAIN_ABSTRACTION.md`'s example future adapters describe.
- OR and NOT are real, requested-later extensions, not things to design speculatively now (see Future Extensions below). Adding them later is additive to the grammar (a new `language_version`), not a breaking change to version-1 documents.

### Grammar (EBNF-ish)

```
condition     = field, ws, operator, ws, literal ;
field         = identifier, { ".", identifier } ;        (* dot-path, e.g. vendor.approved *)
identifier    = letter, { letter | digit | "_" } ;
operator      = "<=" | ">=" | "==" | "!=" | "<" | ">" | "in" ;
literal       = number | string | boolean | list ;
number        = [ "-" ], digit, { digit }, [ ".", digit, { digit } ] ;
string        = "'", { any character except "'" }, "'" ;
boolean       = "true" | "false" ;
list          = "[", literal, { ",", literal }, "]" ;      (* only valid as the right side of `in` *)
ws            = " " ;                                        (* exactly one space required either side, for now *)
```

Notes on specific choices:

- **Unquoted string literals in the directive's own example** (`currency == ZAR`) are informal shorthand; the actual grammar requires quoting (`currency == 'ZAR'`) to keep the grammar unambiguous (an unquoted bareword is otherwise indistinguishable from a second field reference). The Monaco editor and the AI Policy Builder's output should always emit quoted strings; a human typing the bare form gets a clear, specific parse error suggesting the quoted form, not a silent misparse.
- **`in`** exists from version 1 (not deferred) because "action within an approved category list" is a common enough real-world condition (see `DOMAIN_ABSTRACTION.md`'s Procurement adapter example, "which vendor categories") that leaving it out would force it to be modeled as several `==` conditions with an implicit OR the language doesn't otherwise support, which is worse than including one well-scoped list operator.
- **Dot-path fields** (`vendor.approved`) mean the active adapter's field vocabulary is itself allowed to be nested, not just a flat namespace. The adapter is responsible for declaring which dot-paths are valid, and the semantic validator rejects unrecognized ones exactly as it would an unrecognized top-level field.

### Field vocabulary is adapter-owned, not hardcoded here

This spec does not enumerate `amount`, `currency`, `counterparty`, or `vendor.approved` as "the" fields. Those are the Financial adapter's vocabulary (see `DOMAIN_ABSTRACTION.md`), and the language must work identically for whatever fields a future adapter declares. Concretely, an adapter is expected to publish:

- A list of valid field names/dot-paths, each with a declared type (`number`, `string`, `boolean`, `list-of-string`, etc.).
- A list of valid operators per field type (e.g. `<=`/`>=`/`<`/`>` are only meaningful for `number` fields; `in` only for fields compared against a list).

This is exactly the information Monaco's autocomplete and the semantic validator both need, and exactly the information `POLICY_STUDIO.md`'s editor design depends on being available from the adapter at edit time.

## Validation

Two distinct passes, matching `AUTHORING_ARCHITECTURE.md`'s validation table:

1. **Schema validation** (language-level, adapter-independent): valid YAML, required top-level fields present, `conditions` entries parse against the grammar above. A malformed condition line (bad operator, unquoted string, mismatched bracket) is caught here with a specific line/column and a message naming exactly what was expected.
2. **Semantic validation** (adapter-dependent): `action` is a recognized scope for the active adapter; every condition's `field` is a recognized dot-path for that adapter; the `literal`'s type matches the field's declared type (a `number` field compared with a quoted string is a semantic error, not a schema error, since it's syntactically well-formed but meaningless); `operator` is valid for that field's declared type.

## Compilation mapping (summary; full compiler design in `POLICY_COMPILER_V2.md`)

Each condition compiles to one Rego comparison expression inside the generated `allow`/`deny`/`requires_review` rules for that Runtime Policy's compiled Mandate, generalizing today's fixed `REGO_TEMPLATE` (which hardcodes exactly the three conditions in the directive's own example, amount, currency, and an implicit review threshold, as the *only* conditions it knows how to express) into an actual per-Runtime-Policy compilation step. This is the single biggest piece of net-new compiler work this whole initiative requires; `POLICY_COMPILER_V2.md` covers why and how in depth.

## Error reporting model

Every validation failure, from either pass, is reported as:

```
{
  "line": <1-indexed line number>,
  "column": <1-indexed column>,
  "severity": "error" | "warning",
  "message": "<specific, actionable message>",
  "code": "<stable machine-readable error code, e.g. SCHEMA_BAD_OPERATOR, SEMANTIC_UNKNOWN_FIELD>"
}
```

This shape is what Monaco's diagnostics/marker API consumes directly (see `POLICY_STUDIO.md`), and the stable `code` field is what lets the editor offer a specific quick-fix (e.g. "did you mean `amount`?") rather than just surfacing raw text.

## Language versioning

`language_version` is a field on every saved document, not an inferred property. A future grammar change (e.g. introducing `and`/`or`/`not` as described below) increments it. The parser must remain able to read every prior `language_version` it has ever shipped; this is the same non-negotiable a public API version needs, and for the same reason, saved drafts and already-approved Runtime Policies must never become unreadable because the language evolved.

## Explicit non-goals for version 1 (deferred, not forgotten)

- **Boolean composition** (`and`/`or`/`not`, parenthesized grouping). Deferred because the flat-AND-list shape already covers every example in this directive and keeps both the compiler and the conflict-detector's job bounded. When real usage demonstrates a need (a condition that's genuinely "A or B," not just "list more conditions"), add it as `language_version: 2`, additive to existing documents.
- **Cross-field expressions** (comparing two fields to each other, e.g. `amount <= vendor.credit_limit`). Not in any example given; adds real complexity to both compilation and conflict detection; defer until a concrete need exists.
- **Arithmetic beyond literal comparison** (e.g. `amount * 1.1 <= limit`). Same reasoning; defer.
- **User-defined functions or macros.** This is explicitly not meant to become a general programming language; if a real need for reusable condition fragments emerges, the better answer is likely adapter-provided named conditions (the adapter declares a reusable named check, the language just references it by name), not a macro system inside the language itself.
