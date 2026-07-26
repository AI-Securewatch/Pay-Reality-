"""Claude-backed RuntimePolicyExtractionProvider: PROMPT_LIBRARY.md is the
source of truth for the exact prompt and schema this sends; keep the two
in sync. Forced tool-use is what makes "the AI must never generate Rego"
a structural property of the call, not a hoped-for prompt outcome: the
model's only possible output is a call to a tool whose schema has no
field where Rego, source code, or free-form prose could go.

Imports domain/compiler_v2 and domain/runtime_policy only to read their
existing public vocabulary (FINANCIAL_VOCABULARY.known_actions, the
Operator enum), never to modify either; this is exactly the "inject the
real vocabulary, never hardcode a second copy" discipline
DOMAIN_REFACTOR_PLAN.md item 5 already named as a real drift bug once
caught elsewhere in this codebase.
"""

import anthropic

from app.config import settings
from app.domain.ai_policy_builder.provider import CandidateCondition, CandidateRuntimePolicy
from app.domain.compiler_v2.compiler_v2 import FINANCIAL_VOCABULARY
from app.domain.runtime_policy.conditions import Operator

SYSTEM_PROMPT_TEMPLATE = """You extract candidate Runtime Policies from enterprise authority documents
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
that candidate entirely rather than forcing a mismatch."""


def _build_tool_schema() -> dict:
    known_actions = sorted(FINANCIAL_VOCABULARY.known_actions)
    known_operators = [o.value for o in Operator]
    return {
        "name": "record_candidate_runtime_policies",
        "description": (
            "Record every candidate Runtime Policy found in the document, each "
            "tagged with its source location and your own confidence in it."
        ),
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
                                "description": "A short, human-readable name for this policy, e.g. 'Regional Controller EMEA - Vendor Payment Limit'.",
                            },
                            "principal": {
                                "type": "string",
                                "description": "The role or named individual this grant is for, e.g. 'Regional Controller, EMEA'.",
                            },
                            "action": {
                                "type": "string",
                                "description": f"One of: {', '.join(known_actions)}. Use the closest match; do not invent new values.",
                            },
                            "resource": {
                                "type": ["string", "null"],
                                "description": "What the action targets, if the document names one specifically. Null if unscoped.",
                            },
                            "conditions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "field": {"type": "string", "description": "e.g. 'amount', 'currency'."},
                                        "operator": {"type": "string", "enum": known_operators},
                                        "value": {"description": "A number, string, boolean, or list, matching the operator."},
                                    },
                                    "required": ["field", "operator", "value"],
                                },
                            },
                            "constraints": {
                                "type": "object",
                                "properties": {
                                    "delegated_by": {"type": ["string", "null"], "description": "Who granted this authority, if named."},
                                    "evidence_required": {"type": ["boolean", "null"]},
                                    "risk_level": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                                },
                            },
                            "effect": {
                                "type": "string",
                                "enum": ["allow", "deny", "require_human_review"],
                                "description": "What happens when this policy's conditions are met. Use require_human_review if the document describes an approval or escalation step.",
                            },
                            "metadata_owner": {
                                "type": ["string", "null"],
                                "description": "Who is accountable for this policy (e.g. the approving executive), if named.",
                            },
                            "metadata_tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Short free-text labels, e.g. a department or document section name.",
                            },
                            "confidence": {
                                "type": "number",
                                "description": "Your own honest confidence, 0.0 to 1.0, that this candidate is fully and correctly extracted.",
                            },
                            "missing_fields": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Names of fields above you could not confidently determine from the text.",
                            },
                            "source_excerpt": {
                                "type": "string",
                                "description": "The exact sentence(s) or row this candidate was extracted from.",
                            },
                            "source_location": {
                                "type": "string",
                                "description": "The location marker from the document text this candidate came from.",
                            },
                        },
                        "required": ["name", "principal", "action", "effect", "confidence", "source_excerpt", "source_location"],
                    },
                }
            },
            "required": ["candidates"],
        },
    }


class ClaudeRuntimePolicyExtractionProvider:
    def __init__(self, client: anthropic.Anthropic | None = None):
        self._client = client or anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def extract(self, document_text: str) -> list[CandidateRuntimePolicy]:
        known_actions = sorted(FINANCIAL_VOCABULARY.known_actions)
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(known_actions=", ".join(known_actions))
        tool = _build_tool_schema()

        response = self._client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            system=system_prompt,
            tools=[tool],
            tool_choice={"type": "tool", "name": "record_candidate_runtime_policies"},
            messages=[{"role": "user", "content": document_text}],
        )

        candidates: list[CandidateRuntimePolicy] = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            for raw in block.input.get("candidates", []):
                constraints = raw.get("constraints") or {}
                candidates.append(
                    CandidateRuntimePolicy(
                        name=raw["name"],
                        principal=raw["principal"],
                        action=raw["action"],
                        effect=raw["effect"],
                        confidence=max(0.0, min(1.0, float(raw["confidence"]))),
                        source_excerpt=raw["source_excerpt"],
                        source_location=raw["source_location"],
                        resource=raw.get("resource"),
                        conditions=tuple(
                            CandidateCondition(field=c["field"], operator=c["operator"], value=c["value"])
                            for c in raw.get("conditions", [])
                        ),
                        delegated_by=constraints.get("delegated_by"),
                        evidence_required=constraints.get("evidence_required"),
                        risk_level=constraints.get("risk_level"),
                        metadata_owner=raw.get("metadata_owner"),
                        metadata_tags=tuple(raw.get("metadata_tags", [])),
                        missing_fields=tuple(raw.get("missing_fields", [])),
                    )
                )
        return candidates
