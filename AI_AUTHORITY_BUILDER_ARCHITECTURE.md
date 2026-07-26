# AI Authority Builder: Architecture

## What changed from AI Policy Builder

The AI Policy Builder (previous phase) took one document and produced candidate Runtime Policies. The AI Authority Builder takes an **Authority Corpus**, a set of one or more documents uploaded together and analyzed as a single body of evidence about one organisation's authority structure, and produces a full **Authority Graph**: Runtime Policy candidates, but also the Principals, Resources, Operations, Relationships (delegation/escalation/inheritance chains), Conflicts, Gaps (missing information), and clarification Questions the model found across the whole corpus.

This is additive, not a rewrite. Every table, service function, and API endpoint the AI Policy Builder built is preserved unmodified: `policy_extraction_uploads`, single-document upload, and the existing promote/dismiss/edit flow for a candidate all still work exactly as before. The AI Authority Builder is a new layer that produces *more kinds* of discovered objects from *more than one document at once*, and reuses the existing candidate machinery for the one kind of object both systems share (Runtime Policy candidates).

## Why this is additive, not a replacement

`services/ai_policy_builder_service.py`'s `promote_candidate`, `dismiss_candidate`, and `edit_candidate` operate on a `PolicyExtractionCandidate` row by id; they have no idea whether that row came from a single-document upload or a multi-document corpus. This phase makes exactly two changes to that existing table, both backward-compatible: `upload_id` becomes nullable (a corpus-derived candidate has no single owning upload) and a new nullable `corpus_id` column is added (a `CHECK` constraint enforces exactly one of the two is set, never both, never neither). Every existing row, and every existing single-upload API call, is unaffected: `upload_id` is still always set for anything created through the original `/v1/ai-policy-builder/uploads` endpoint, which itself is untouched.

## The corpus model

An `AuthorityCorpus` (`authority_corpora`) is the unit of analysis: one or many uploaded documents (`authority_corpus_documents`), extracted and analyzed together in a single LLM call, never document-by-document. The directive's own instruction, "treat all uploaded files as ONE Authority Corpus, never analyse documents independently," is implemented literally: `text_extraction.extract_text` (imported unchanged from the AI Policy Builder) runs once per document to get that document's own marked-up text, and those per-document texts are concatenated with a `=== FILE: <filename> ===` header before the single extraction call, so the model sees the whole corpus as one body of evidence and can, for example, notice that one document's delegation limit contradicts another's.

## The Authority Graph

One extraction call returns, via forced tool-use (the same structural guarantee against generating Rego or deploying that `PROMPT_LIBRARY.md` established: the tool schema has no field for either), all of:

- **Policies**: identical shape to the AI Policy Builder's candidates, stored in the same `policy_extraction_candidates` table, promoted through the same, unmodified `promote_candidate`.
- **Principals**: every authority holder named, with an optional `reports_to` for reconstructing a reporting hierarchy.
- **Resources** and **Operations**: every business object and verb named across the corpus, informational (there is no first-class "Resource" or "Operation" table anywhere else in the platform yet, per `DOMAIN_AGNOSTIC_ARCHITECTURE.md`; these rows describe what the organisation's documents say, they do not create new enforceable vocabulary anywhere else in this phase).
- **Relationships**: delegation, escalation, or inheritance links between named principals, as the model found them stated or implied.
- **Conflicts**: contradictory or duplicate authority the model noticed across documents. This is model-reported, reviewed by a human, never a formal constraint-satisfaction proof; the UI never claims otherwise, the same "never oversell a heuristic" discipline Compiler V2's own bounded conflict detection already holds itself to.
- **Gaps**: missing information the model expected to find and didn't (an undefined approver, an unstated limit, a resource mentioned but never scoped).
- **Questions**: clarification questions the model generated for a human reviewer, not confidence-scored (a question is a request for information, not a claim to be confident or unconfident about); a reviewer can mark one answered and record the answer.

Every item in every category carries `confidence`, `source_excerpt`, and `source_location` (which document and where), exactly as the AI Policy Builder's candidates already do, so nothing here introduces a new epistemic standard, only more categories held to the existing one.

## What the AI can never do (structural, not just prompted)

Identical guarantees to the AI Policy Builder, extended to every new category: the tool schema has no field for Rego, source code, or a deploy/activate instruction anywhere in it, for any of the eight categories. The only category with a promotion path into a real, enforceable system object is Policies, via the completely unmodified `runtime_policy_service.create_policy`. Principals, Resources, Operations, Relationships, Conflicts, and Gaps have no "promote" action at all in this phase, because there is no first-class system table for any of them to promote into yet; they exist purely as reviewable, cited findings. Questions can only be marked answered, never auto-resolved.

## Why the module isn't renamed on disk

The directive asks that the *product* be renamed from AI Policy Builder to AI Authority Builder. The user-facing surface (navigation, page titles, the entry point from Policy Studio) reflects that rename directly. The underlying Python package (`domain/ai_policy_builder/`, `services/ai_policy_builder_service.py`) is deliberately left in place and untouched: it is still exactly correct for what it does (single-document, Runtime-Policy-only extraction), it is imported by the new `domain/ai_authority_builder/` package rather than duplicated, and renaming already-shipped, already-tested modules purely for naming symmetry would be exactly the kind of unforced churn this multi-phase engagement has consistently avoided (see `RUNTIME_POLICY_MAPPING.md`'s and `DOMAIN_AGNOSTIC_ARCHITECTURE.md`'s own preference for reuse over renaming-for-its-own-sake). A new user only ever sees "AI Authority Builder"; which files implement it is an internal detail this document exists to explain, not something the product surface needs to expose.
