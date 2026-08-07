import { useEffect, useState } from "react";
import { Link } from "react-router";
import { organizationApi } from "./api";
import { RequirePermission } from "../auth/RequireAuth";
import { describeApiError } from "../live/format";
import { getTheme, setTheme, type Theme } from "../lib/theme";
import type { HealthState, HealthStatus, IntegrationsStatus, IntegrationStatus, OrganizationSettings } from "./types";

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-card)",
  border: "1px solid var(--pr-overlay-05)",
  borderRadius: 12,
};

const TABS = [
  "General",
  "Security",
  "Runtime Authority",
  "Integrations",
  "Notifications",
  "Audit",
  "Organisation Health",
  "About",
] as const;

type Tab = (typeof TABS)[number];

function fieldLabelStyle(): React.CSSProperties {
  return { color: "var(--pr-text-muted)", display: "block", marginBottom: 6 };
}

function inputStyle(): React.CSSProperties {
  return {
    backgroundColor: "var(--pr-input-bg)",
    color: "var(--pr-text-primary)",
    border: "1px solid var(--pr-overlay-08)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    width: "100%",
  };
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="text-sm font-medium px-4 py-2 rounded-lg mt-4"
      style={{ backgroundColor: "var(--pr-authority-blue)", color: "white", opacity: saving ? 0.6 : 1 }}
    >
      {saving ? "Saving..." : "Save changes"}
    </button>
  );
}

const HEALTH_COLORS: Record<HealthState, string> = {
  healthy: "var(--pr-trust-green)",
  warning: "var(--pr-warning-amber)",
  offline: "var(--pr-critical-red)",
};

const INTEGRATION_COLORS: Record<IntegrationStatus, string> = {
  connected: "var(--pr-trust-green)",
  configuration_required: "var(--pr-warning-amber)",
  disconnected: "var(--pr-critical-red)",
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function GeneralTab({ settings, onSaved }: { settings: OrganizationSettings; onSaved: (s: OrganizationSettings) => void }) {
  const [name, setName] = useState(settings.name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [currency, setCurrency] = useState(settings.default_currency);
  const [language, setLanguage] = useState(settings.default_language);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await organizationApi.updateSettings({
        name,
        timezone,
        default_currency: currency,
        default_language: language,
        logo_url: logoUrl || null,
      });
      onSaved(updated);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <label style={fieldLabelStyle()}>Organisation Name</label>
        <input style={inputStyle()} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label style={fieldLabelStyle()}>Logo URL</label>
        <input style={inputStyle()} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label style={fieldLabelStyle()}>Timezone</label>
        <input style={inputStyle()} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </div>
      <div>
        <label style={fieldLabelStyle()}>Default Currency</label>
        <input style={inputStyle()} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
      </div>
      <div>
        <label style={fieldLabelStyle()}>Default Language</label>
        <input style={inputStyle()} value={language} onChange={(e) => setLanguage(e.target.value)} />
      </div>
      <SaveButton onClick={save} saving={saving} />
      {message && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}

      <AppearanceSection />
    </div>
  );
}

function AppearanceSection() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  function choose(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div style={{ ...cardStyle, padding: 16 }} className="mt-6">
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>Appearance</h3>
      <p className="text-xs mb-3" style={{ color: "var(--pr-text-muted)" }}>
        Light or dark mode for this browser. This is a personal display preference, not an
        organisation-wide setting -- it isn't saved to the organisation and won't affect anyone
        else's view of the platform.
      </p>
      <div className="flex gap-2">
        {(["light", "dark"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            className="text-sm font-medium px-4 py-2 rounded-lg capitalize"
            style={
              theme === option
                ? { backgroundColor: "var(--pr-authority-blue)", color: "white" }
                : { border: "1px solid var(--pr-overlay-10)", color: "var(--pr-text-secondary)" }
            }
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecurityTab({ settings, onSaved }: { settings: OrganizationSettings; onSaved: (s: OrganizationSettings) => void }) {
  const extra = settings.settings ?? {};
  const [sessionTimeout, setSessionTimeout] = useState(String(extra.session_timeout_minutes ?? 480));
  const [mfaRequired, setMfaRequired] = useState(Boolean(extra.mfa_required));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await organizationApi.updateSettings({
        settings: {
          session_timeout_minutes: Number(sessionTimeout) || 480,
          mfa_required: mfaRequired,
        },
      });
      onSaved(updated);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>Operator Key</h3>
        <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
          The shared superuser credential (ADMIN_API_KEY) is set as a deploy-time environment variable,
          not something this UI can rotate live. See EVIDENCE_KEY_ROTATION.md's runbook pattern for how
          a similar rotation is done safely; the same real-runbook approach applies here.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>Signature Window</h3>
        <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
          Intent signatures are valid for a fixed window (server INTENT_SIGNATURE_WINDOW_SECONDS),
          configured per deployment, not per organisation.
        </p>
      </div>

      <div className="max-w-md space-y-4">
        <div>
          <label style={fieldLabelStyle()}>Session Timeout (minutes)</label>
          <input
            type="number"
            min={5}
            style={inputStyle()}
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-text-primary)" }}>
          <input type="checkbox" checked={mfaRequired} onChange={(e) => setMfaRequired(e.target.checked)} />
          Require MFA for all users
        </label>
        <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
          This sets the requirement only. A full enrolment/verification flow isn't built yet -- see
          RBAC.md's disclosed scope.
        </p>
        <SaveButton onClick={save} saving={saving} />
        {message && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}
      </div>

      <ApiKeysSection />
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<import("./types").ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("auditor");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    organizationApi.listApiKeys().then(setKeys).catch(() => setKeys([]));
  }
  useEffect(load, []);

  async function create() {
    if (!name.trim()) return;
    try {
      const result = await organizationApi.createApiKey(name, role);
      setRawKey(result.raw_key);
      setName("");
      load();
    } catch (e) {
      setMessage(describeApiError(e, "Create API key"));
    }
  }

  async function revoke(id: string) {
    try {
      await organizationApi.revokeApiKey(id);
      load();
    } catch (e) {
      setMessage(describeApiError(e, "Revoke"));
    }
  }

  return (
    <div style={{ ...cardStyle, padding: 16 }}>
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>API Keys</h3>
      <p className="text-xs mb-3" style={{ color: "var(--pr-text-muted)" }}>
        Each key is scoped to a role, and each role carries the same decision rights whether a
        person or an API key is exercising it, not a separate credential-only permission set.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          style={{ ...inputStyle(), width: 200 }}
          placeholder="Key name (e.g. CI pipeline)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select style={{ ...inputStyle(), width: 180 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="owner">Organisation Owner</option>
          <option value="governance_admin">Governance Administrator</option>
          <option value="agent_admin">Agent Administrator</option>
          <option value="reviewer">Reviewer</option>
          <option value="auditor">Auditor</option>
          <option value="executive">Executive</option>
        </select>
        <button
          type="button"
          onClick={create}
          className="text-sm font-medium px-4 py-2 rounded-lg"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "white" }}
        >
          Create key
        </button>
      </div>

      {rawKey && (
        <div className="mb-3 p-3 rounded-lg text-xs" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--pr-warning-amber)" }}>
          Copy this now -- it won't be shown again: <code className="break-all">{rawKey}</code>
        </div>
      )}
      {message && <p className="text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}

      <div className="space-y-1.5">
        {(keys ?? []).map((k) => (
          <div key={k.id} className="flex items-center justify-between text-xs py-1.5" style={{ color: "var(--pr-text-secondary)" }}>
            <span>
              {k.name} <span style={{ color: "var(--pr-text-muted)" }}>({k.key_prefix}...)</span> -- {humanize(k.role)}
            </span>
            {k.revoked_at ? (
              <span style={{ color: "var(--pr-text-disabled)" }}>Revoked</span>
            ) : (
              <button type="button" onClick={() => revoke(k.id)} style={{ color: "var(--pr-critical-red)" }}>
                Revoke
              </button>
            )}
          </div>
        ))}
        {keys?.length === 0 && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>No API keys yet.</p>}
      </div>
    </div>
  );
}

function RuntimeAuthorityTab({ settings, onSaved }: { settings: OrganizationSettings; onSaved: (s: OrganizationSettings) => void }) {
  const extra = settings.settings ?? {};
  const [reviewBehavior, setReviewBehavior] = useState(String(extra.default_human_review_behavior ?? "escalate"));
  const [retentionDays, setRetentionDays] = useState(String(extra.evidence_retention_days ?? 2555));
  const [policyBehavior, setPolicyBehavior] = useState(String(extra.default_policy_behavior ?? "deny"));
  const [decisionLogging, setDecisionLogging] = useState(extra.decision_logging_enabled !== false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await organizationApi.updateSettings({
        settings: {
          default_human_review_behavior: reviewBehavior,
          evidence_retention_days: Number(retentionDays) || 2555,
          default_policy_behavior: policyBehavior,
          decision_logging_enabled: decisionLogging,
        },
      });
      onSaved(updated);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
        These are the organisation-wide defaults Runtime Authority falls back to when a specific
        rule doesn't cover a case, not a replacement for your own delegated authority and rules.
      </p>
      <div>
        <label style={fieldLabelStyle()}>Default Human Review Behaviour</label>
        <select style={inputStyle()} value={reviewBehavior} onChange={(e) => setReviewBehavior(e.target.value)}>
          <option value="escalate">Escalate to Review Queue</option>
          <option value="deny">Deny by default</option>
        </select>
      </div>
      <div>
        <label style={fieldLabelStyle()}>Evidence Retention (days)</label>
        <input type="number" min={1} style={inputStyle()} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} />
        <p className="text-xs mt-1" style={{ color: "var(--pr-text-muted)" }}>
          Recorded as policy today; no automated purge job exists yet.
        </p>
      </div>
      <div>
        <label style={fieldLabelStyle()}>Default Policy Behaviour</label>
        <select style={inputStyle()} value={policyBehavior} onChange={(e) => setPolicyBehavior(e.target.value)}>
          <option value="deny">Fail closed (deny)</option>
          <option value="review">Fail to human review</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-text-primary)" }}>
        <input type="checkbox" checked={decisionLogging} onChange={(e) => setDecisionLogging(e.target.checked)} />
        Decision logging enabled
      </label>
      <SaveButton onClick={save} saving={saving} />
      {message && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}
    </div>
  );
}

function IntegrationsTab() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  useEffect(() => {
    organizationApi.getIntegrations().then(setStatus);
  }, []);

  const rows: Array<{ key: keyof IntegrationsStatus; label: string }> = [
    { key: "anthropic", label: "Anthropic" },
    { key: "azure_openai", label: "Azure OpenAI" },
    { key: "aws_bedrock", label: "AWS Bedrock" },
    { key: "opa", label: "OPA" },
    { key: "postgresql", label: "PostgreSQL" },
  ];

  return (
    <div style={{ ...cardStyle, padding: 16, maxWidth: 480 }}>
      <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
        These are the components Runtime Authority itself runs on. The enterprise systems it
        protects, the ERP, CRM, procurement, and finance systems an agent's action ultimately
        reaches, connect separately and are not yet listed here.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{row.label}</span>
            {status ? (
              <Pill label={humanize(status[row.key])} color={INTEGRATION_COLORS[status[row.key]]} />
            ) : (
              <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Checking...</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{ color: "var(--pr-text-muted)" }}>
        Azure OpenAI and AWS Bedrock have no integration built yet -- shown honestly as
        "Configuration Required," never fabricated as Connected.
      </p>
    </div>
  );
}

function NotificationsTab({ settings, onSaved }: { settings: OrganizationSettings; onSaved: (s: OrganizationSettings) => void }) {
  const extra = (settings.settings?.notifications as Record<string, unknown>) ?? {};
  const [email, setEmail] = useState(Boolean(extra.email));
  const [slack, setSlack] = useState(Boolean(extra.slack));
  const [teams, setTeams] = useState(Boolean(extra.teams));
  const [webhookUrl, setWebhookUrl] = useState(String(extra.webhook_url ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await organizationApi.updateSettings({
        settings: { notifications: { email, slack, teams, webhook_url: webhookUrl } },
      });
      onSaved(updated);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>
        These preferences are stored, not yet wired to real delivery -- no email, Slack, or Teams
        integration exists in this platform today.
      </p>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-text-primary)" }}>
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
      </label>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-text-primary)" }}>
        <input type="checkbox" checked={slack} onChange={(e) => setSlack(e.target.checked)} /> Slack
      </label>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-text-primary)" }}>
        <input type="checkbox" checked={teams} onChange={(e) => setTeams(e.target.checked)} /> Microsoft Teams
      </label>
      <div>
        <label style={fieldLabelStyle()}>Webhook URL</label>
        <input style={inputStyle()} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
      </div>
      <SaveButton onClick={save} saving={saving} />
      {message && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}
    </div>
  );
}

function AuditTab({ settings, onSaved }: { settings: OrganizationSettings; onSaved: (s: OrganizationSettings) => void }) {
  const extra = settings.settings ?? {};
  const [retentionDays, setRetentionDays] = useState(String(extra.audit_retention_days ?? 2555));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await organizationApi.updateSettings({
        settings: { audit_retention_days: Number(retentionDays) || 2555 },
      });
      onSaved(updated);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  async function exportEvidence() {
    setExporting(true);
    try {
      const records = await organizationApi.exportEvidence();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "evidence-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(describeApiError(e, "Export"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label style={fieldLabelStyle()}>Audit Retention (days)</label>
        <input type="number" min={1} style={inputStyle()} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} />
      </div>
      <SaveButton onClick={save} saving={saving} />
      {message && <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{message}</p>}

      <div className="pt-2">
        <p className="text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>
          "Audit Export" and "Evidence Export" are the same underlying ledger in this platform --
          every signed Evidence record IS the audit trail.
        </p>
        <button
          type="button"
          onClick={exportEvidence}
          disabled={exporting}
          className="text-sm font-medium px-4 py-2 rounded-lg"
          style={{ border: "1px solid var(--pr-authority-blue)", color: "var(--pr-authority-blue)" }}
        >
          {exporting ? "Exporting..." : "Export evidence (JSON)"}
        </button>
      </div>
    </div>
  );
}

function OrganisationHealthTab() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  useEffect(() => {
    organizationApi.getHealth().then(setHealth);
  }, []);

  const rows: Array<{ key: keyof HealthStatus; label: string }> = [
    { key: "runtime_authority", label: "Runtime Authority Engine" },
    { key: "evidence_engine", label: "Evidence Engine" },
    { key: "opa", label: "OPA" },
    { key: "compiler", label: "Compiler" },
    { key: "database", label: "Database" },
    { key: "anthropic", label: "Anthropic" },
  ];

  return (
    <div style={{ ...cardStyle, padding: 16, maxWidth: 480 }}>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{row.label}</span>
            {health ? (
              <Pill label={humanize(health[row.key])} color={HEALTH_COLORS[health[row.key]]} />
            ) : (
              <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Checking...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutTab() {
  const [version, setVersion] = useState<{ version: string; commit: string } | null>(null);
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? "/api";
    fetch(`${base}/version`)
      .then((r) => r.json())
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  return (
    <div style={{ ...cardStyle, padding: 16, maxWidth: 480 }}>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Version</dt>
          <dd style={{ color: "var(--pr-text-primary)" }}>{version?.version ?? "..."}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Build</dt>
          <dd style={{ color: "var(--pr-text-primary)" }} className="font-mono text-xs">{version?.commit ?? "..."}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Deployment</dt>
          <dd style={{ color: "var(--pr-text-primary)" }}>Render + Vercel</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Documentation</dt>
          <dd><a href="https://github.com/AI-Securewatch/Pay-Reality-" style={{ color: "var(--pr-authority-blue)" }}>GitHub</a></dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Support</dt>
          <dd style={{ color: "var(--pr-text-primary)" }}>sean@aisecurewatch.com</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--pr-text-muted)" }}>Status Page</dt>
          <dd><Link to="/organization?tab=Organisation+Health" style={{ color: "var(--pr-authority-blue)" }}>Organisation Health</Link></dd>
        </div>
      </dl>
    </div>
  );
}

export function OrganizationSettingsPage() {
  const [tab, setTab] = useState<Tab>("General");
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizationApi.getSettings().then(setSettings).catch((e) => setError(describeApiError(e, "Load settings")));
  }, []);

  return (
    <RequirePermission permission="settings.view">
      <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
        <div className="mb-6">
          <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Organisation Settings</h1>
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13, maxWidth: 640 }}>
            How this organisation is configured, who has access, and whether the platform is healthy.{" "}
            <Link to="/organization/users" style={{ color: "var(--pr-authority-blue)" }}>Manage users and roles →</Link>
          </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 border-b pb-0" style={{ borderColor: "var(--pr-overlay-05)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="text-sm px-3 py-2 rounded-t-lg"
              style={{
                color: tab === t ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
                borderBottom: tab === t ? "2px solid var(--pr-authority-blue)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="text-xs mb-4" style={{ color: "var(--pr-critical-red)" }}>{error}</p>}

        {!settings ? (
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>Loading...</p>
        ) : (
          <>
            {tab === "General" && <GeneralTab settings={settings} onSaved={setSettings} />}
            {tab === "Security" && <SecurityTab settings={settings} onSaved={setSettings} />}
            {tab === "Runtime Authority" && <RuntimeAuthorityTab settings={settings} onSaved={setSettings} />}
            {tab === "Integrations" && <IntegrationsTab />}
            {tab === "Notifications" && <NotificationsTab settings={settings} onSaved={setSettings} />}
            {tab === "Audit" && <AuditTab settings={settings} onSaved={setSettings} />}
            {tab === "Organisation Health" && <OrganisationHealthTab />}
            {tab === "About" && <AboutTab />}
          </>
        )}
      </div>
    </RequirePermission>
  );
}
