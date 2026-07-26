# Policy Studio Components

React component breakdown for the eight pages in `POLICY_STUDIO_WIREFRAMES.md`, at `src/app/policy-studio/`. Matches the existing app's conventions: function components, no class components, no new UI framework dependency, styled with the same inline-style-plus-CSS-custom-property approach every existing Live page already uses (`--pr-*` tokens, see `ARCHITECTURE.md`).

## A deliberate departure from the earlier Policy Studio design

`POLICY_STUDIO.md` (written for the V5 directive, before `RuntimePolicy` and Compiler V2 existed as real code) designed a Monaco-based YAML editor for manual authoring. This phase's directive describes the Policy Workspace as structured sections (Identity, Scope, Conditions, Constraints, Effect, Metadata, Audit), not a text editor, and this implementation follows *this* directive: a structured form, condition-by-condition, not free-text YAML. This is also a better fit for "enterprise, minimal, GitHub-level clarity, no gimmicks": a form whose fields map one-to-one onto `RuntimePolicy`'s actual dataclasses is more auditable at a glance than a code editor, and it avoids a Monaco dependency this phase never asked for. If free-text authoring is wanted later, `POLICY_STUDIO.md`'s Monaco design is still there, unused, not deleted, and could become a second editing mode alongside this one without conflicting with it.

## Shared components

- **`PolicyStatusBadge`**: renders a `PolicyStatus` value as plain text with a subtle left-border color (not a colored pill/gimmick), reused everywhere a status appears (List, Workspace, Version History, Review Queue).
- **`ConditionRow`**: one condition: field (text input), operator (select, populated from the `Operator` enum), value (text input, type-coerced on save based on operator: numeric operators parse as numbers, `in` parses as a comma-separated list, `exists` renders as a true/false select instead of free text). Used in the Workspace and reused, read-only, in the Diff view.
- **`ScopeFields`**: principal/action/agent/resource, four inputs, action constrained to a dropdown populated from `GET /v1/runtime-policies/vocabulary` (the Financial adapter's `KNOWN_SCOPES`, fetched once, not hardcoded a second time in the frontend, the same drift bug named and fixed in `DOMAIN_REFACTOR_PLAN.md` item 5 for the existing Runtime Decisions page; this new page is built correctly from the start instead of repeating it).
- **`CompilerDiagnosticsList`**: renders a list of `CompilerError` (code, message, path) as plain text rows, used by both the Compile and Deploy pages, never a generic "something went wrong."
- **`ApiError` handling**: reuses the existing `apiClient.ts`/`ApiError` pattern verbatim (see `src/app/live/apiClient.ts`); Policy Studio does not introduce a second HTTP client or error-handling convention.

## Page components

### `PolicyListPage`
`src/app/policy-studio/PolicyListPage.tsx`. Fetches `GET /v1/runtime-policies`, client-side search/filter/sort over the fetched list (no server-side pagination in this pass; the pilot's real policy counts don't warrant it yet, matching this codebase's existing "don't build for a scale that doesn't exist" discipline). A table, `name`/`version`/`status` (via `PolicyStatusBadge`)/`last modified`/`owner`, each row linking to `PolicyWorkspacePage`.

### `PolicyWorkspacePage`
`src/app/policy-studio/PolicyWorkspacePage.tsx`. One page, two modes (create: no `policy_key` in the route; edit: `policy_key` present, fetches the latest version). Renders `ScopeFields`, a list of `ConditionRow`, the Constraints/Effect/Metadata sections as plain form fields, and a read-only `AuditTrail` summary. Save always calls `POST /v1/runtime-policies` (create) or `PUT /v1/runtime-policies/{policy_key}` (edit, always producing a new draft version per `POLICY_STUDIO_WORKFLOW.md`), never a partial/PATCH update, since a `RuntimePolicy` is authored as a whole value, not assembled from independent field-level edits.

### `CompilePage`
`src/app/policy-studio/CompilePage.tsx`. One button, one result panel. Calls `POST /v1/runtime-policies/{policy_key}/compile`; renders `CompilerDiagnosticsList` on failure, or the bundle summary (id, hash, compiler version) on success with a link into `DryRunPage`.

### `DryRunPage`
`src/app/policy-studio/DryRunPage.tsx`. A small form (principal, action, resource, a raw-JSON context textarea, since the shape of "context" is adapter-owned and this page can't know its fields in advance any better than the backend can), calling `POST /v1/runtime-policies/{policy_key}/dry-run`. Result panel: Decision (`ALLOW`/`DENY`/`HUMAN_REVIEW`, derived client-side from the returned `allow`/`deny`/`requires_review` the same way `domain/decision/engine.py` already derives it, so the UI's notion of "the decision" never diverges from the engine's own precedence rule), Reason (`review_reason`/`deny_reason`, whichever applies), and Evidence Required (read directly from the compiled policy's `Constraints.evidence_required`, not computed).

### `VersionHistoryPage`
`src/app/policy-studio/VersionHistoryPage.tsx`. Fetches `GET /v1/runtime-policies/{policy_key}/versions`, one row per version (version, status via `PolicyStatusBadge`, author, timestamp, change summary), a Rollback action on any non-active version (calls Deploy against that version's already-compiled bundle, see `POLICY_STUDIO_WORKFLOW.md`), and a version-pair selector feeding into `PolicyDiffPage`.

### `PolicyDiffPage`
`src/app/policy-studio/PolicyDiffPage.tsx`. Calls `GET /v1/runtime-policies/{policy_key}/diff?from=&to=`. Renders three sections directly off the API's structured response: the condition-by-condition diff (added/removed/modified, reusing `ConditionRow` in a read-only, non-editable mode with an added/removed/modified indicator), Affected Agents (a plain list, each linking to the existing `LiveAgents.tsx` page rather than duplicating agent details here), and Risk Impact (rendered as plain text, `increased`/`decreased`/`unchanged`, with the one-sentence reasoning the API already returns, never just a bare label with no justification, matching `COMPILER_V2_ARCHITECTURE.md`'s discipline of never presenting a heuristic as more certain than it is).

### `ReviewQueuePage`
`src/app/policy-studio/ReviewQueuePage.tsx`. Fetches every `RuntimePolicyRecord` with status `pending_review` across all policies (`GET /v1/runtime-policies?status=pending_review`), each row with Approve/Reject actions inline (Reject requires a reason, a required text field, not an optional one, since `RuntimePolicy`'s reviewer workflow should carry at least as much rigor as today's Authority review flow already does, `LiveDocuments.tsx`'s existing reject-requires-reason behavior, kept consistent rather than weakened here).

### `DeploymentPage`
`src/app/policy-studio/DeploymentPage.tsx`. Only reachable/enabled for a `compiled` version. Displays the stored Compiler Result (from the compile step, not re-run silently), Bundle Version, Bundle Hash, and, after a successful Deploy call, Deployment Time. States plainly, in the page copy itself, that deploying replaces whatever is currently active and takes effect for real Intent evaluation immediately (`POLICY_STUDIO_ARCHITECTURE.md`'s "Deploy is real" section), not hedged or softened.

## Navigation

`src/app/components/Layout.tsx` gains one new top-level entry, "Policy Studio," routed to `PolicyListPage`; the existing five-item workflow nav (`Overview → Authority → Policy → Runtime Decisions → Evidence → Assurance`) is otherwise unchanged. `src/app/routes.tsx` gains the new routes under `/policy-studio/*`.
