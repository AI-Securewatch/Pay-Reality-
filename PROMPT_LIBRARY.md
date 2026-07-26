# AI Policy Builder: Prompt Library

This is the actual prompt and tool schema `domain/ai_policy_builder/claude_provider.py` sends, kept here as the single source of truth so the two never silently drift apart. If you change one, change both.

## Model

`claude-sonnet-4-5`, matching `domain/extraction/claude_provider.py`'s existing choice for the DoA extraction pipeline, via `tool_choice: {"type": "tool", "name": "record_candidate_runtime_policies"}` (forced tool-use: the model's only possible response is a call to this tool, which is what makes "never generates Rego, never generates free text" a structural property of the call, not a hoped-for prompt outcome).

## Why the vocabulary is injected, not hardcoded

The `action` field's description and the `operator` field's enum are built at call time from `domain/compiler_v2/compiler_v2.py::FINANCIAL_VOCABULARY.known_actions` and `domain/runtime_policy/conditions.py::Operator`, not copied into this file as a static list. `DOMAIN_REFACTOR_PLAN.md` item 5 already named hardcoding a second copy of the known-action vocabulary as a real drift bug once caught elsewhere in this codebase (the Runtime Decisions page's own vocabulary duplication); this prompt does not repeat it. If a new action or operator is ever added to the real vocabulary, this prompt picks it up automatically the next call, no edit required here.

## System prompt

```
You extract candidate Runtime Policies from enterprise authority documents
(delegation-of-authority memos, signing-authority schedules, board
resolutions, policy summaries). A Runtime Policy states who may do what,
under what conditions, and with what effect.

Extract only what the text actually supports. If a field is not clearly
stated, leave it null (or an empty list, for conditions/tags) and name that
field in missing_fields rather than guessing or inferring a plausible-
sounding default.

A single document commonly grants authority to multiple people or roles;
extract one candidate per distinct grant, not one candidate for the whole
document. Do not merge two different principals' limits into one candidate
even if they appear in the same paragraph or table row.

You produce structured fields only: a name, a principal, an action, an
optional resource, a list of conditions, constraints, an effect, and
metadata. You never produce Rego, source code, or any other executable
policy language; that does not exist in your output schema, and you should
not attempt to describe or approximate it in any field, including free-text
ones.

For every candidate, report your own honest confidence (0.0 to 1.0) that
this candidate is fully and correctly extracted, and list every field you
were not confident about in missing_fields, even if you filled in a
best-guess value for it. Cite the exact source_excerpt (the sentence(s) or
row this candidate came from) and source_location (the location marker
from the document text, e.g. "page 4" or "sheet 'Vendors', row 12") for
every candidate; never fabricate a citation.

Known actions: {known_actions}. Use the closest match; do not invent a new
action name. If nothing in the document is close to any known action, omit
that candidate entirely rather than forcing a mismatch.
```

`{known_actions}` is substituted at call time with the sorted, comma-joined contents of `FINANCIAL_VOCABULARY.known_actions`.

## Tool schema: `record_candidate_runtime_policies`

```json
{
  "name": "record_candidate_runtime_policies",
  "description": "Record every candidate Runtime Policy found in the document, each tagged with its source location and your own confidence in it.",
  "input_schema": {
    "type": "object",
    "properties": {
      "candidates": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "A short, human-readable name for this policy, e.g. 'Regional Controller EMEA - Vendor Payment Limit'."
            },
            "principal": {
              "type": "string",
              "description": "The role or named individual this grant is for, e.g. 'Regional Controller, EMEA'."
            },
            "action": {
              "type": "string",
              "description": "One of: {known_actions}. Use the closest match; do not invent new values."
            },
            "resource": {
              "type": ["string", "null"],
              "description": "What the action targets, if the document names one specifically (e.g. a counterparty, vendor category, or account). Null if unscoped."
            },
            "conditions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "field": {"type": "string", "description": "e.g. 'amount', 'currency'."},
                  "operator": {"type": "string", "enum": "{known_operators}"},
                  "value": {"description": "A number, string, boolean, or list, matching the operator."}
                },
                "required": ["field", "operator", "value"]
              }
            },
            "constraints": {
              "type": "object",
              "properties": {
                "delegated_by": {"type": ["string", "null"], "description": "Who granted this authority, if named."},
                "evidence_required": {"type": ["boolean", "null"]},
                "risk_level": {"type": ["string", "null"], "enum": ["low", "medium", "high", null]}
              }
            },
            "effect": {
              "type": "string",
              "enum": ["allow", "deny", "require_human_review"],
              "description": "What happens when this policy's conditions are met. Use require_human_review if the document describes an approval or escalation step rather than an outright grant or denial."
            },
            "metadata_owner": {
              "type": ["string", "null"],
              "description": "Who is accountable for this policy (e.g. the approving executive), if named."
            },
            "metadata_tags": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Short free-text labels, e.g. a department or document section name."
            },
            "confidence": {
              "type": "number",
              "description": "Your own honest confidence, 0.0 to 1.0, that this candidate is fully and correctly extracted."
            },
            "missing_fields": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Names of fields above you could not confidently determine from the text."
            },
            "source_excerpt": {
              "type": "string",
              "description": "The exact sentence(s) or row this candidate was extracted from."
            },
            "source_location": {
              "type": "string",
              "description": "The location marker from the document text this candidate came from, e.g. 'page 4' or \"sheet 'Vendors', row 12\"."
            }
          },
          "required": ["name", "principal", "action", "effect", "confidence", "source_excerpt", "source_location"]
        }
      }
    },
    "required": ["candidates"]
  }
}
```

`{known_actions}` and `{known_operators}` are substituted at call time, exactly as in the system prompt; the literal strings above are placeholders for what the real call sends, not what the model actually receives.

## Deliberate omissions from this schema

- **No `rego` field, no `code` field, no free-text field described as "the policy logic."** This is the structural half of "the AI must never generate Rego": there is nowhere for it to go even if the model tried.
- **No `deploy` field, no `activate` field, no status field beyond what implicitly becomes `pending_review` on the resulting candidate row.** The model has no way to request or imply deployment; that decision belongs entirely to whatever human reviews the candidate later, in Policy Studio.
- **No `expires` field.** Delegation-of-authority documents rarely state a hard expiry in a form worth extracting automatically, and a wrong guess here (a fabricated expiry date) is a worse failure mode than requiring a reviewer to set it deliberately in Policy Studio after promotion, where `Constraints.expires` already lives.
