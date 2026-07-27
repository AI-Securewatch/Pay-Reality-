# Organisation Settings

## Why this exists

Before this change there was no dedicated place to configure the platform itself -- no organisation name, no security posture, no visibility into whether Runtime Authority, Evidence, OPA, the Compiler, the database, or the AI provider were actually healthy. A CIO evaluating this platform had no single place to answer "how is this configured, and can I trust it right now."

Organisation Settings is that place: eight tabs, backed by real endpoints and real data, not a mockup. Where a capability genuinely isn't built yet (email delivery, TOTP-based MFA, a live Azure OpenAI/AWS Bedrock integration), the UI says so honestly rather than fabricating a status.

## Data model

Most fields live directly on the `Organization` row (`name`, `logo_url`, `timezone`, `default_currency`, `default_language`) since they're queried and validated individually. Everything else -- Security tab toggles, Runtime Authority defaults, Notifications config, Audit retention -- lives in one `settings` JSONB blob (`server/app/services/organization_service.py::update_settings`). A PATCH merges into that blob rather than replacing it wholesale, so saving the Notifications tab can never silently clobber the Runtime Authority tab's fields.

`GET/PATCH /v1/organization/settings` is gated by `settings.view`/`organisation.manage` -- per RBAC.md's matrix, only the Organisation Owner has either permission today. That matches the spec's own can/cannot lists: no other role was granted visibility into organisation-level configuration.

## The eight tabs

**General** -- Organisation Name, Logo, Timezone, Default Currency, Default Language. Plain columns on `Organization`, editable via one form.

**Security** -- Operator Keys, API Keys, Signature Window, Session Timeout, MFA Requirement.
- *Operator Keys*: displayed as informational text, not a live rotation control. `ADMIN_API_KEY` is a deploy-time environment variable; rotating it safely follows the same real-runbook pattern as `EVIDENCE_KEY_ROTATION.md`, not a button that mutates a running process's own config.
- *API Keys*: fully real. `POST /v1/organization/api-keys` generates a `pr_live_...` secret, shown exactly once, with only its SHA-256 hash stored (see RBAC.md). List and revoke are both live.
- *Signature Window*: displayed as informational text (`INTENT_SIGNATURE_WINDOW_SECONDS`) -- a deployment-wide setting, not per-organisation, so there's nothing to edit here yet.
- *Session Timeout*: a real, editable field (`settings.session_timeout_minutes`), read by `auth_service.create_session` at login time to set that session's fixed expiry.
- *MFA Requirement*: a real toggle (`settings.mfa_required`) and a real schema field (`User.mfa_enabled`) -- disclosed honestly as a requirement flag only, not a TOTP enrollment/challenge flow (see RBAC.md's "What this doesn't fix").

**Runtime Authority** -- Default Human Review Behaviour, Evidence Retention, Default Policy Behaviour, Decision Logging. All stored in the settings blob today as *recorded policy*, not yet wired to change the Decision Engine's actual runtime behavior -- the engine's fail-closed defaults (`HUMAN_REVIEW` on any ambiguity) are unconditional today regardless of what's set here. Recording the setting now, and wiring enforcement to it later, was the deliberate order: get the configuration surface and audit trail right first.

**Integrations** -- Anthropic, Azure OpenAI, AWS Bedrock, OPA, PostgreSQL, each shown as Connected / Disconnected / Configuration Required. Real state only:
- Anthropic: `connected` if `ANTHROPIC_API_KEY` is actually set, `configuration_required` otherwise -- never fabricated as connected the way the AI Authority/Policy Builders' underlying fake-provider fallback could mislead someone into believing.
- Azure OpenAI / AWS Bedrock: always `configuration_required`. There is zero integration code for either in this codebase today; showing anything else would be exactly the kind of fabrication this whole engagement has been working to remove.
- OPA / PostgreSQL: live-checked (`organization_service._opa_reachable`, `_database_reachable`), the same underlying checks `/health/ready` already performs.

**Notifications** -- Email, Slack, Microsoft Teams, Webhook URL. Stored as configuration only (`settings.notifications`). There is no email, Slack, or Teams delivery integration in this platform -- the UI says this directly rather than implying these toggles do something they don't.

**Audit** -- Retention Period, Evidence Export, Audit Export. Retention is a recorded setting (`settings.audit_retention_days`), not yet enforced by an automated purge job. Evidence Export and Audit Export are, honestly, the same underlying data: every signed Evidence record *is* this platform's audit trail (`GET /v1/organization/exports/evidence`, gated by `audit.export`), so both buttons produce the same JSON download rather than two separately-branded exports of data that doesn't actually differ.

**Organisation Health** -- Runtime Authority Engine, Evidence Engine, OPA, Compiler, Database, Anthropic, each Healthy / Warning / Offline. Reuses the same live checks as `/health/ready` rather than inventing a second, parallel notion of "healthy" (`organization_service.get_health_status`):
- Runtime Authority and Evidence Engine have no separate health probe of their own -- they *are* this process, backed by this database -- so their status is honestly derived from the database check, not measured independently.
- The Compiler is a pure in-process module with no external dependency and no health endpoint of its own; it always reports healthy since it has no failure mode a health check could observe from the outside.
- Gated by `assurance.view`, which the Owner, Governance Administrator, Auditor, *and* Executive all hold -- matching the success criteria's "an Executive should be able to see whether the platform is healthy."

**About** -- Version, Build Number, Deployment, Documentation, Support, Status Page. Version and Build (`GET /version`, already existed, unauthenticated) are read live rather than hardcoded, so this tab can never silently drift out of date with what's actually deployed. Status Page links to the Organisation Health tab rather than a separate, external status page that doesn't exist yet.

## Users

Not one of the eight tabs, but adjacent to Security: `UsersPage.tsx` (`/organization/users`), gated by `users.manage` (Owner only). Add a user (email, name, role), change a user's role, disable/re-enable a user. Creating a user generates a temporary password shown once, the same disclosed pattern as the Owner bootstrap in RBAC.md -- there's no email delivery to send it through yet, so the UI says exactly that rather than implying an invite email goes out.

## Navigation

"Organisation Settings" was added as a new top-level sidebar item (`src/app/components/Layout.tsx`). There was no pre-existing "Settings" nav item to rename -- only a legacy `/settings` redirect-to-home route from an earlier consolidation pass -- so that redirect now points at `/organization` instead of `/`, and the new item was added rather than renamed in place.

## Security

Every one of these endpoints is enforced server-side via `require_permission` (see RBAC.md) -- frontend tab visibility is a UX nicety, not the actual gate. `RequirePermission` in the frontend hides a tab's content and shows a plain explanation if a role lacks access, but the real enforcement is the 403 the backend already returns regardless of what the frontend renders.

## Migration and backward compatibility

No existing Runtime Authority behavior changed. The Organisation Owner bootstrap and the new tables are purely additive (see RBAC.md); every existing operator-key-authenticated workflow, SDK integration, and frontend action continues to work exactly as it did before this phase, unchanged.
