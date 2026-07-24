"""Claude-backed ExtractionProvider implementation -- spec Section 12.4
Stage 2+3. This is genuinely non-deterministic (spec 21.4); its output is
never trusted directly and only ever produces pending_review Authority rows
(spec 13.1). Swappable behind ExtractionProvider (Principle 7) -- nothing
downstream of app.domain.extraction.provider.ExtractionProvider depends on
Claude specifically.
"""

import json

import anthropic

from app.config import settings
from app.domain.extraction.provider import CandidateAuthority

EXTRACTION_TOOL = {
    "name": "record_candidate_authorities",
    "description": (
        "Record every delegation-of-authority grant found in the document, "
        "each tagged with the page it was found on and the exact source text."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "candidates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "principal_name": {
                            "type": "string",
                            "description": "The role or named individual holding this authority, e.g. 'Regional Controller — EMEA'.",
                        },
                        "scope": {
                            "type": "string",
                            "description": "One of: vendor_payment, purchase_order_create, wire_transfer. Use the closest match; do not invent new values.",
                        },
                        "limit_amount": {"type": ["number", "null"]},
                        "currency": {"type": ["string", "null"]},
                        "conditions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "e.g. 'requires_dual_approval_above_25000' if the text implies a dual-control threshold.",
                        },
                        "source_excerpt": {
                            "type": "string",
                            "description": "The exact sentence(s) this claim was extracted from.",
                        },
                        "source_page": {"type": "integer"},
                        "incomplete_fields": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Names of fields above you could not confidently determine from the text.",
                        },
                    },
                    "required": ["principal_name", "scope", "source_excerpt", "source_page"],
                },
            }
        },
        "required": ["candidates"],
    },
}

SYSTEM_PROMPT = (
    "You extract delegation-of-authority claims from enterprise governance "
    "documents. Extract only what the text actually supports -- if an amount, "
    "currency, or condition is not stated, leave it null and list the field "
    "in incomplete_fields rather than guessing. Every candidate must cite the "
    "exact source_excerpt and source_page it came from."
)


class ClaudeExtractionProvider:
    def __init__(self, client: anthropic.Anthropic | None = None):
        self._client = client or anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def extract(self, document_text_by_page: list[str]) -> list[CandidateAuthority]:
        document_text = "\n\n".join(
            f"--- page {i + 1} ---\n{text}" for i, text in enumerate(document_text_by_page)
        )
        response = self._client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=[EXTRACTION_TOOL],
            tool_choice={"type": "tool", "name": "record_candidate_authorities"},
            messages=[{"role": "user", "content": document_text}],
        )

        candidates: list[CandidateAuthority] = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            for raw in block.input.get("candidates", []):
                candidates.append(
                    CandidateAuthority(
                        principal_name=raw["principal_name"],
                        scope=raw["scope"],
                        limit_amount=raw.get("limit_amount"),
                        currency=raw.get("currency"),
                        conditions=raw.get("conditions", []),
                        source_excerpt=raw["source_excerpt"],
                        source_page=raw["source_page"],
                        incomplete_fields=raw.get("incomplete_fields", []),
                    )
                )
        return candidates
