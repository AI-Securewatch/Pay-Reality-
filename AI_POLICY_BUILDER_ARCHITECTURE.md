# AI Policy Builder: Architecture

## What this is

A third authoring path into Policy Studio, alongside the Guided Wizard and Manual Policy Studio described in `AUTHORING_ARCHITECTURE.md`. It converts an uploaded enterprise authority document (a delegation-of-authority memo, a signing-authority spreadsheet, a board resolution, a plain-text policy summary) into one or more draft RuntimePolicy candidates, ready for human review and, once accepted, into the exact same Policy Studio workflow every other authoring path already uses: Compile, Dry Run, Deploy.

It is not a fourth compiler, a fourth policy language, or a second Decision Engine. It produces the same canonical `RuntimePolicy` shape `RUNTIME_POLICY_LANGUAGE.md` already defines, using the same validation, the same compiler, the same deploy mechanism, all completely unmodified.

## Non-negotiable boundaries

This phase's directive is explicit, and this document holds itself to it structurally, not just by convention:

- **Runtime Policy, Compiler V2, OPA, the Runtime (Decision) Engine, Evidence, and Policy Studio are not modified.** Every one of those is imported and called through its existing public interface. The AI Policy Builder is new code in new files; nothing in `domain/runtime_policy/`, `domain/compiler_v2/`, `domain/decision/`, `services/runtime_policy_service.py`, `routers/runtime_policies.py`, or any Policy Studio frontend file changes as part of this phase.
- **The AI never generates Rego.** Structurally enforced, not just prompted: the extraction tool schema the model is forced to call has no field for Rego, source code, or anything resembling a compiler target. It can only emit the same JSON-shaped fields a human typing into Policy Studio's Manual mode would produce. Compiler V2 is the only thing that ever produces Rego, and it only ever runs when a human explicitly clicks Compile in Policy Studio.
- **The AI never deploys.** The AI Policy Builder's service layer has no import of, or access to, `deploy_policy`, the OPA client, or the `policies` table. A candidate's only possible terminal states are `pending_review`, `dismissed`, or `promoted`; "promoted" means a new **draft** RuntimePolicy now exists in Policy Studio, at the very first stage of its own independent review lifecycle (`draft -> pending_review -> approved -> compiled -> active`). Getting from there to a live, deployed policy requires the same human actions, in Policy Studio, that every manually authored policy already requires.

## Where it fits in the existing system

```
                Guided Wizard   Manual Policy Studio   AI Policy Builder  (this phase)
                      \                |                    /
                       \               |                   /
                        v              v                  v
                       RuntimePolicy (domain/runtime_policy/)
                                       |
                                Policy Studio
                            (create draft, review,
                          approve, compile, dry run, deploy)
                                       |
                                 Compiler V2
                                       |
                                     OPA
                                       |
                              Decision Engine (unchanged)
```

The three authoring paths converge on the same `RuntimePolicy` the moment a candidate is promoted. From that point forward, the AI Policy Builder has no further involvement: the resulting row is indistinguishable in Policy Studio from a policy a human typed by hand, except that its `metadata.tags` includes `"ai-extracted"` and its `metadata.created_by` names the upload it came from, both purely descriptive.

## New components (all new files, nothing shared is edited)

**Backend**
- `domain/ai_policy_builder/text_extraction.py` — format-specific text extraction (PDF, DOCX, XLSX, CSV, plain text) into one marked-up text blob with location citations, so every downstream stage can work on plain text regardless of source format.
- `domain/ai_policy_builder/provider.py` — the `RuntimePolicyExtractionProvider` protocol and the canonical `CandidateRuntimePolicy` shape every implementation must produce, mirroring `domain/extraction/provider.py`'s existing vendor-neutrality pattern (Principle 7) for the *other* extraction pipeline (DoA documents -> Authority claims). This is a deliberately parallel, not shared, abstraction: the two pipelines produce different target shapes (`CandidateAuthority` vs `CandidateRuntimePolicy`) for different domains (the legacy Authority/Mandate model vs RuntimePolicy), and conflating them would be exactly the kind of coupling `DOMAIN_ABSTRACTION.md` already warns against.
- `domain/ai_policy_builder/claude_provider.py` — the real implementation, using the Anthropic SDK's forced tool-use (already a proven pattern in this codebase via `domain/extraction/claude_provider.py`), detailed in `AI_EXTRACTION_PIPELINE.md` and `PROMPT_LIBRARY.md`.
- `domain/ai_policy_builder/fake_provider.py` — deterministic stand-in for tests and for running without `ANTHROPIC_API_KEY` configured, same role `domain/extraction/fake_provider.py` already plays.
- `db/models.py` additions: `PolicyExtractionUpload` and `PolicyExtractionCandidate` (new tables, new migration; `runtime_policy_records` is untouched).
- `services/ai_policy_builder_service.py` — upload storage, extraction orchestration, candidate CRUD (human review edits before promotion), and `promote_candidate`, which builds a `RuntimePolicy` object itself (a small, deliberate duplication of the construction logic `routers/runtime_policies.py` already has, chosen over importing a private router function or editing that file) and hands it to the *unmodified* `runtime_policy_service.create_policy`.
- `schemas/ai_policy_builder.py` — request/response models, reusing `schemas/runtime_policy.py`'s `ScopeSchema`/`ConditionSchema`/`ConstraintsSchema`/`MetadataSchema` by import rather than redefining them.
- `routers/ai_policy_builder.py` — `/v1/ai-policy-builder/...`, a new router mounted alongside, not inside, `routers/runtime_policies.py`.

**Frontend**
- `src/app/ai-policy-builder/` — Upload page and Review/Promote page, plus a `ConfidenceBadge` component. Reuses Policy Studio's existing `ConditionRow`, `ScopeFields`, and `types.ts` by import (candidate content is stored in exactly the `RuntimePolicyRequest` JSON shape those components already edit), so editing a candidate before promotion looks and behaves identically to editing a draft policy in Policy Studio.
- A new top-level nav item, "AI Policy Builder," alongside "Policy Studio," not folded into it: promotion is the seam between two genuinely different products (an extraction tool and an authoring/governance workspace), and collapsing them into one page would blur that boundary in exactly the way `POLICY_STUDIO_ARCHITECTURE.md` was careful not to blur Policy Studio into the legacy Policy/Document page.

## Data model

**`policy_extraction_uploads`**: one row per uploaded file. `format` (`pdf|docx|xlsx|csv|text`), `content` (the byte-identical original, stored in Postgres for the same reason `documents.content` already is: local disk does not survive a redeploy and is root-owned in this container), `status` (`uploaded -> extracted|failed`).

**`policy_extraction_candidates`**: one row per extracted RuntimePolicy candidate, `content` (a `RuntimePolicyRequest`-shaped JSON dict, directly editable, directly postable to Policy Studio's create endpoint once accepted), `confidence` (0.0-1.0, self-reported by the model, never assumed accurate, exactly the same epistemic stance `CandidateAuthority.incomplete_fields` already takes toward the *other* extraction pipeline's output), `missing_fields`, `source_excerpt`, `source_location`, and `status` (`pending_review -> promoted|dismissed`).

A candidate is never auto-promoted. A document can, and usually will, produce multiple candidates (one delegation-of-authority document typically names several roles, each with its own limits); each is reviewed and promoted independently.

## Why extraction is synchronous, not a job queue

The existing DoA document pipeline (`services/document_service.py::run_extraction`) already runs extraction synchronously inside the upload request, accepting the LLM call's latency as part of the request/response cycle rather than introducing a job queue, worker process, or polling endpoint. The AI Policy Builder follows the same choice, for the same reason: it is the simplest thing that is still correct, this pilot has no existing job infrastructure to reuse, and a failed extraction is cheap to retry (the document is already stored; nothing is lost).

## Honesty about what "confidence" means

The confidence score is the model's own, uncalibrated self-report, exactly like `incomplete_fields` already is for the DoA pipeline. It is a useful triage signal for a human reviewer ("check this one first"), not a probability with any statistical guarantee behind it. This is stated directly in the Review page's UI copy, not just in this document, so no reviewer mistakes a low-effort skim of a "95% confidence" candidate for the same scrutiny a manually authored policy already requires before it reaches `approved`.
