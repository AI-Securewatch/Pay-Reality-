# AI Policy Builder: Runtime Policy Mapping

How one `record_candidate_runtime_policies` tool-call item (`PROMPT_LIBRARY.md`) becomes a stored candidate, and how a stored candidate becomes a real `RuntimePolicy` on promotion. Every step here is plain, deterministic Python; nothing past Stage 3 of `AI_EXTRACTION_PIPELINE.md` is the model's responsibility.

## Raw tool output -> `CandidateRuntimePolicy`

`domain/ai_policy_builder/claude_provider.py` normalizes each raw item from the tool call into `domain/ai_policy_builder/provider.py::CandidateRuntimePolicy`, the canonical shape every provider implementation (Claude or fake) must produce:

| Raw tool field | `CandidateRuntimePolicy` field | Notes |
|---|---|---|
| `name` | `name` | required |
| `principal` | `principal` | required |
| `action` | `action` | required; validated against the known vocabulary at promotion time, not trusted just because the model was asked to use it |
| `resource` | `resource` | nullable |
| `conditions` | `conditions` | list of `{field, operator, value}` dicts, passed through structurally unchanged |
| `constraints.delegated_by` | `delegated_by` | nullable |
| `constraints.evidence_required` | `evidence_required` | nullable; `None` means "not stated," distinct from an explicit `false` |
| `constraints.risk_level` | `risk_level` | nullable |
| `effect` | `effect` | required |
| `metadata_owner` | `metadata_owner` | nullable |
| `metadata_tags` | `metadata_tags` | list, may be empty |
| `confidence` | `confidence` | required, clamped to `[0.0, 1.0]` defensively even though the model is asked to stay in range |
| `missing_fields` | `missing_fields` | list, may be empty |
| `source_excerpt` | `source_excerpt` | required |
| `source_location` | `source_location` | required |

## `CandidateRuntimePolicy` -> stored candidate `content`

`services/ai_policy_builder_service.py` persists each candidate's `content` in exactly `schemas/runtime_policy.py::RuntimePolicyRequest`'s JSON shape, the same shape Policy Studio's Manual mode already posts to `POST /v1/runtime-policies`:

| `CandidateRuntimePolicy` | `RuntimePolicyRequest` (stored `content`) | Notes |
|---|---|---|
| `name` | `name` | unchanged |
| — | `description` | always `null`; the model is not asked for a description, only a name (a description invites free-text drift the tool schema is otherwise careful to avoid) |
| `principal` | `scope.principal` | unchanged |
| `action` | `scope.action` | unchanged |
| — | `scope.agent` | always `null`; agent-level scoping narrower than a principal is a Policy Studio refinement, not something a document typically states |
| `resource` | `scope.resource` | unchanged |
| `conditions` | `conditions` | unchanged |
| `delegated_by` | `constraints.delegated_by` | unchanged |
| — | `constraints.expires` | always `null`, deliberately (`PROMPT_LIBRARY.md`'s "Deliberate omissions"); set later in Policy Studio if applicable |
| `evidence_required` | `constraints.evidence_required` | defaults to `true` if the model left it `null`, matching `Constraints`' own default (fail toward requiring more evidence, not less) |
| `risk_level` | `constraints.risk_level` | unchanged |
| `effect` | `effect` | unchanged |
| `metadata_owner` | `metadata.owner` | unchanged |
| — | `metadata.created_by` | always `"ai_policy_builder"`, set by the service layer, never by the model: provenance is a fact about the pipeline, not something to ask an LLM to self-report |
| `metadata_tags` | `metadata.tags` | the model's tags, plus `"ai-extracted"` always appended, so any promoted policy is identifiable as AI-sourced in Policy Studio's Policy List without opening it |

`confidence`, `missing_fields`, `source_excerpt`, and `source_location` are **not** part of `content`; they are stored as separate columns on `policy_extraction_candidates`, because they describe the extraction, not the policy. A promoted `RuntimePolicy` carries no trace of its own confidence score; once approved by a human, it is a policy on its own merits, not a hedged one.

## Stored candidate `content` -> `RuntimePolicy` (on promotion)

`ai_policy_builder_service.py::_build_runtime_policy_from_candidate` constructs the domain object directly (see `AI_POLICY_BUILDER_ARCHITECTURE.md` for why this is a deliberate small duplication rather than an import from `routers/runtime_policies.py`):

```
id          = str(uuid4())                  # fresh, like any new policy
version     = 1
status      = PolicyStatus.DRAFT            # same as manual create_policy
scope       = Scope(**content["scope"])
conditions  = ConditionSet(all=(Condition(...) for c in content["conditions"]))
effect      = Effect(content["effect"])
constraints = Constraints(**content["constraints"])
metadata    = Metadata(**content["metadata"])
audit       = AuditTrail(created=datetime.now(timezone.utc))
```

Then, unchanged:
1. `domain/runtime_policy/validators.py::validate(policy)` — the same validation every other authoring path already runs through. Duplicate conditions, unsupported operators, type-mismatched values, and unknown effects are caught here, exactly as they would be for a manually typed policy; the AI Policy Builder gets no exemption.
2. `services/runtime_policy_service.py::create_policy(db, policy)` — the exact function Policy Studio's own create endpoint calls. The returned `RuntimePolicyRecord` is what the candidate's `promoted_policy_key` points to.

## Field-by-field honesty notes

- **`action` is checked against the vocabulary at promotion time, not just described to the model.** `validators.py` does not itself enforce the known-action list (that is `Compiler V2`'s job at compile time, via `FINANCIAL_VOCABULARY`), so a candidate with a slightly-off action name will still promote to a draft; it will simply fail to compile later, with the same clear compiler diagnostic any manually authored policy with a bad action would get. This is intentional: promotion creates a draft for further human editing, not a finished, compiled policy.
- **A `confidence` of 1.0 is not a green light to skip review.** Nothing in the promotion path reads `confidence`; it exists purely for the human reviewer's attention, per `AI_POLICY_BUILDER_ARCHITECTURE.md`'s "Honesty about what confidence means."
- **`missing_fields` naming a field does not block promotion.** It is a highlight, not a validator. A candidate missing `resource` (because the document didn't scope one) is often completely correct as an unscoped grant; flagging it lets a reviewer confirm that reading rather than assume it.
