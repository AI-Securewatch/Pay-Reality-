# AI Policy Builder: Extraction Pipeline

## Stages

```
Upload
  |  store the byte-identical original (Postgres, not local disk)
  v
Extract Text
  |  format-specific -> one marked-up plain-text blob with location citations
  v
LLM Analysis
  |  forced tool-use, structured output only, no Rego, no free text
  v
Structured Candidates
  |  RuntimePolicyRequest-shaped JSON + confidence + missing_fields, persisted
  v
Human Review
  |  edit, dismiss, or promote; nothing here is trusted without this step
  v
Policy Studio (unmodified)
  |  the promoted candidate is now a draft RuntimePolicy like any other
  v
Compiler V2 -> Dry Run -> Deploy   (unmodified, human-driven, unchanged by this phase)
```

## Stage 1: Upload

`POST /v1/ai-policy-builder/uploads`, multipart, operator-key gated (mutating the system's policy surface, even at draft stage, follows the same `verify_operator_key` convention every other mutating endpoint in this codebase already uses).

Format is detected from the file extension first, falling back to `content_type`, and rejected with `422 unsupported_format` if neither maps to a supported type. Supported: `.pdf`, `.docx`, `.xlsx`/`.xls`, `.csv`, `.txt`/plain text. The raw bytes are stored immediately, before extraction runs, so a failed extraction never loses the source document; it can be retried without re-uploading (the same recovery posture `document_service.py` already established for `extraction_failed`).

## Stage 2: Extract Text

Every format is normalized to one thing: a single plain-text string with inline location markers, so Stage 3's prompt and tool schema never need to know what format the original was.

| Format | Extraction method | Location marker |
|---|---|---|
| PDF | `pypdf.PdfReader`, page by page (same library `document_service.py` already uses) | `--- page N ---` |
| DOCX | `python-docx`, paragraphs and table cells in document order | `--- paragraph N ---` (docx has no native page concept without a rendering engine; this is stated as a real, honest limitation, not hidden) |
| XLSX | `openpyxl`, sheet by sheet, row by row, cells joined with tabs | `--- sheet 'Name', row N ---` |
| CSV | stdlib `csv.reader`, row by row | `--- row N ---` |
| Plain text | UTF-8 decode, no chunking | `--- document ---` (single marker) |

A completely empty extraction (a scanned, non-OCR'd PDF, an empty spreadsheet) is a valid outcome, not an error: the upload lands in `extracted` status with zero candidates, exactly mirroring `document_service.py`'s existing "zero extractable claims is a valid outcome" stance.

## Stage 3: LLM Analysis

One Anthropic Messages API call per upload, using forced tool-use (`tool_choice: {"type": "tool", "name": "record_candidate_runtime_policies"}`), the same mechanism `domain/extraction/claude_provider.py` already relies on for the DoA pipeline. Forced tool-use is what makes "the AI must never generate Rego" a structural guarantee rather than a prompted request: the model's only possible output is a call to a tool whose schema has no field where Rego, code, or free-form prose could go. See `PROMPT_LIBRARY.md` for the exact system prompt and tool schema.

The model receives the full marked-up text (not chunked further; a delegation-of-authority document or signing-authority spreadsheet is small enough to fit a single context window in every case this pilot targets) and returns zero or more candidates in one call.

## Stage 4: Structured Candidates

Each item the model returns is normalized into `CandidateRuntimePolicy` (`domain/ai_policy_builder/provider.py`) and persisted as one `policy_extraction_candidates` row, `status=pending_review`. Nothing here writes to `runtime_policy_records`; a candidate is not yet a RuntimePolicy of any kind; it is data about one.

`content` is stored in exactly the shape `schemas/runtime_policy.py::RuntimePolicyRequest` already expects, deliberately: it is the same JSON a human would produce by filling out Policy Studio's Manual Policy Studio form, so promoting a candidate is a straight pass-through, and editing a candidate before promotion can reuse Policy Studio's existing `ConditionRow`/`ScopeFields` components unmodified.

## Stage 5: Human Review

`GET /v1/ai-policy-builder/uploads/{id}/candidates` lists everything extracted from one upload. Each candidate shows:
- The full RuntimePolicy fields, editable inline (`PUT /v1/ai-policy-builder/candidates/{id}`), while `status=pending_review`.
- `confidence`, rendered as a visual badge (`AI_POLICY_BUILDER_ARCHITECTURE.md`'s "Honesty about what confidence means" applies directly here: this is a triage aid, not a certainty score).
- `missing_fields`, rendered as explicit highlighted warnings on the specific fields the model could not confidently determine, so a reviewer's attention goes exactly where the model's did not.
- `source_excerpt` and `source_location`, so a reviewer can go back to the original document and check the claim against the actual text, the same audit-friendly citation discipline `CandidateAuthority.source_excerpt`/`source_page` already established for the DoA pipeline.

Two terminal actions: **Dismiss** (`status=dismissed`, no RuntimePolicy is ever created) or **Promote** (`status=promoted`, see Stage 6). There is no bulk-promote: `RUNTIME_POLICY_LANGUAGE.md`'s validation and this phase's own "never trust AI output directly" stance both require a human to have actually looked at each one.

## Stage 6: Promotion into Policy Studio

`POST /v1/ai-policy-builder/candidates/{id}/promote`:
1. Builds a `RuntimePolicy` domain object directly from the candidate's (possibly reviewer-edited) `content`, stamping a fresh `AuditTrail(created=now())` (the exact field whose omission caused a real, since-fixed production bug in Policy Studio's own create path; this phase's construction gets it right from the start rather than repeating that mistake).
2. Runs `domain/runtime_policy/validators.py::validate()` (imported, not modified) against it. A candidate that fails validation (an unsupported operator, a type mismatch, a missing required scope field) is not promotable until the reviewer fixes it; the error is returned as structured `ValidationError`s, the same shape Policy Studio's own compiler errors already use, so the frontend can render them consistently.
3. Calls `runtime_policy_service.create_policy(db, policy)` (imported, not modified): the exact function Policy Studio's own `POST /v1/runtime-policies` endpoint calls. This is the one and only integration point between the two systems.
4. Marks the candidate `promoted` and records the new `policy_key`, so the Review page can link straight to `/policy-studio/{policy_key}`, the existing, unmodified Policy Workspace page, for everything after this point: submit for review, approve, compile, dry run, deploy.

From here forward, the promoted policy is administratively identical to one authored by hand. The AI Policy Builder's job is finished the moment `create_policy` returns.
