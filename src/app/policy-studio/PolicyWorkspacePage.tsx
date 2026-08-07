import { useEffect, useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { Condition, Constraints, Effect, Metadata, RuntimePolicy, RuntimePolicyRequest, Scope } from "./types";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";
import { ConditionRow } from "./components/ConditionRow";
import { ScopeFields } from "./components/ScopeFields";
import { describeApiError } from "../live/format";
import { describePolicy, EFFECT_LABEL } from "./describePolicy";
import { track, trackError } from "../services/analytics";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-hover)",
  border: "1px solid var(--pr-overlay-10)",
  color: "var(--pr-text-primary)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--pr-text-muted)", display: "block", marginBottom: 4 };
const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-card)",
  border: "1px solid var(--pr-overlay-05)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const EMPTY: RuntimePolicyRequest = {
  name: "",
  description: "",
  scope: { principal: "", action: "", agent: null, resource: null },
  conditions: [],
  effect: "require_human_review",
  constraints: { delegated_by: null, expires: null, evidence_required: true, risk_level: null, authority_id: null, mandate_id: null },
  metadata: { owner: null, created_by: null, tags: [] },
};

export function PolicyWorkspacePage() {
  const { policyKey } = useParams();
  const isNew = !policyKey || policyKey === "new";
  const navigate = useNavigate();
  const formId = useId();

  const [existing, setExisting] = useState<RuntimePolicy | null>(null);
  const [form, setForm] = useState<RuntimePolicyRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (isNew) return;
    policyStudioApi.get(policyKey!).then((p) => {
      setExisting(p);
      setForm({
        name: p.name,
        description: p.description,
        scope: p.scope,
        conditions: p.conditions,
        effect: p.effect,
        constraints: p.constraints,
        metadata: p.metadata,
      });
    });
  }, [isNew, policyKey]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const startedAt = Date.now();
    try {
      const saved = isNew ? await policyStudioApi.create(form) : await policyStudioApi.edit(policyKey!, form);
      if (isNew) {
        track("Runtime Policy Generated", {
          policy_id: saved.policy_key,
          source: "manual",
          runtime_policy_generation_ms: Date.now() - startedAt,
        });
      }
      setMessage(`Saved as draft, v${saved.version}.`);
      if (isNew) navigate(`/governance/${saved.policy_key}`);
      else setExisting(saved);
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
      if (isNew) {
        trackError("Runtime Policy Generation Failed", {
          error_type: e instanceof Error ? e.name : "unknown_error",
          component: "policy_studio_manual",
          duration_ms: Date.now() - startedAt,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await policyStudioApi.submitForReview(policyKey!);
      setExisting(updated);
      setMessage("Submitted for review.");
    } catch (e) {
      setMessage(describeApiError(e, "Submit"));
    } finally {
      setSaving(false);
    }
  }

  function updateCondition(index: number, next: Condition) {
    setForm((f) => ({ ...f, conditions: f.conditions.map((c, i) => (i === index ? next : c)) }));
  }
  function removeCondition(index: number) {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, i) => i !== index) }));
  }
  function addCondition() {
    setForm((f) => ({ ...f, conditions: [...f.conditions, { field: "", operator: "==", value: "" }] }));
  }
  function updateScope(scope: Scope) {
    setForm((f) => ({ ...f, scope }));
  }
  function updateConstraints(constraints: Constraints) {
    setForm((f) => ({ ...f, constraints }));
  }
  function updateMetadata(metadata: Metadata) {
    setForm((f) => ({ ...f, metadata }));
  }
  function addTag() {
    if (!tagInput.trim()) return;
    updateMetadata({ ...form.metadata, tags: [...form.metadata.tags, tagInput.trim()] });
    setTagInput("");
  }
  function removeTag(tag: string) {
    updateMetadata({ ...form.metadata, tags: form.metadata.tags.filter((t) => t !== tag) });
  }

  return (
    <div className="p-8 max-w-3xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/governance" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
          &lt; Back to Governance
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
        >
          {saving ? "Saving..." : "Save draft"}
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <h1 style={{ color: "var(--pr-text-primary)" }}>{form.name || "New Rule"}</h1>
        {existing && (
          <>
            <span style={{ color: "var(--pr-text-muted)" }}>v{existing.version}</span>
            <PolicyStatusBadge status={existing.status} />
          </>
        )}
      </div>

      {message && (
        <p role="alert" style={{ color: "var(--pr-text-secondary)", marginBottom: 16 }}>{message}</p>
      )}

      {existing && (
        <div className="mb-4 flex gap-3 text-sm">
          <Link to={`/governance/${policyKey}/versions`} style={{ color: "var(--pr-authority-blue)" }}>
            History
          </Link>
          {existing.status === "draft" && (
            <button onClick={handleSubmitForReview} disabled={saving} style={{ color: "var(--pr-authority-blue)" }}>
              Submit for review
            </button>
          )}
          {(existing.status === "approved" || existing.status === "compiled" || existing.status === "active") && (
            <Link to={`/governance/${policyKey}/publish`} style={{ color: "var(--pr-authority-blue)" }}>
              Publish
            </Link>
          )}
        </div>
      )}

      <div style={{ ...sectionStyle, borderColor: "rgba(77,124,254,0.25)" }}>
        <h2 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-muted)" }}>In plain English</h2>
        <p style={{ color: "var(--pr-text-primary)", fontSize: 15 }}>{describePolicy(form)}</p>
      </div>

      <div style={sectionStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Identity</h2>
        <label htmlFor={`${formId}-name`} style={labelStyle}>Name</label>
        <input
          id={`${formId}-name`}
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <label htmlFor={`${formId}-description`} style={labelStyle}>Description</label>
        <input
          id={`${formId}-description`}
          style={inputStyle}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div style={sectionStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Who, what, and when</h2>
        <ScopeFields scope={form.scope} onChange={updateScope} />
      </div>

      <div style={sectionStyle}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
            Conditions (all must hold)
          </h2>
          <button onClick={addCondition} style={{ color: "var(--pr-authority-blue)", fontSize: 13 }}>
            + Add condition
          </button>
        </div>
        {form.conditions.map((c, i) => (
          <ConditionRow key={i} condition={c} onChange={(next) => updateCondition(i, next)} onRemove={() => removeCondition(i)} />
        ))}
        {form.conditions.length === 0 && (
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>No conditions yet: this policy matches on scope alone.</p>
        )}
      </div>

      <div style={sectionStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Constraints</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-delegated-by`} style={labelStyle}>Delegated by</label>
            <input
              id={`${formId}-delegated-by`}
              style={inputStyle}
              placeholder="Role or person"
              value={form.constraints.delegated_by ?? ""}
              onChange={(e) => updateConstraints({ ...form.constraints, delegated_by: e.target.value || null })}
            />
            <p style={{ fontSize: 11, color: "var(--pr-text-muted)", marginTop: 3 }}>
              The organisational authority this rule enforces, not who wrote it.
            </p>
          </div>
          <div>
            <label htmlFor={`${formId}-risk-level`} style={labelStyle}>Risk level</label>
            <select
              id={`${formId}-risk-level`}
              style={inputStyle}
              value={form.constraints.risk_level ?? ""}
              onChange={(e) => updateConstraints({ ...form.constraints, risk_level: e.target.value || null })}
            >
              <option value="">(none)</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3" style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
          <input
            type="checkbox"
            checked={form.constraints.evidence_required}
            onChange={(e) => updateConstraints({ ...form.constraints, evidence_required: e.target.checked })}
          />
          Evidence required
        </label>
        {(form.constraints.authority_id || form.constraints.mandate_id) && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-3" style={{ borderTop: "1px solid var(--pr-overlay-05)" }}>
            {form.constraints.authority_id && (
              <div>
                <p style={labelStyle}>Authority</p>
                <p style={{ fontSize: 13, color: "var(--pr-text-primary)", fontFamily: "monospace" }}>
                  {form.constraints.authority_id}
                </p>
              </div>
            )}
            {form.constraints.mandate_id && (
              <div>
                <p style={labelStyle}>Mandate</p>
                <p style={{ fontSize: 13, color: "var(--pr-text-primary)", fontFamily: "monospace" }}>
                  {form.constraints.mandate_id}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>What should happen</h2>
        <div className="flex gap-4">
          {(["allow", "deny", "require_human_review"] as Effect[]).map((eff) => (
            <label key={eff} className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
              <input type="radio" checked={form.effect === eff} onChange={() => setForm((f) => ({ ...f, effect: eff }))} />
              {EFFECT_LABEL[eff]}
            </label>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Metadata</h2>
        <label htmlFor={`${formId}-owner`} style={labelStyle}>Owner</label>
        <input
          id={`${formId}-owner`}
          style={{ ...inputStyle, marginBottom: 3 }}
          value={form.metadata.owner ?? ""}
          onChange={(e) => updateMetadata({ ...form.metadata, owner: e.target.value || null })}
        />
        <p style={{ fontSize: 11, color: "var(--pr-text-muted)", marginTop: 0, marginBottom: 10 }}>
          Who maintains this rule day to day, distinct from "Delegated by" above.
        </p>
        <label htmlFor={`${formId}-tag-input`} style={labelStyle}>Tags</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {form.metadata.tags.map((t) => (
            <span key={t} style={{ ...inputStyle, width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t}
              <button
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                style={{ color: "var(--pr-critical-red)", padding: "2px 4px" }}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id={`${formId}-tag-input`}
            style={inputStyle}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="New tag"
          />
          <button onClick={addTag} style={{ color: "var(--pr-authority-blue)", fontSize: 13, padding: "6px 8px" }}>
            + Add tag
          </button>
        </div>
      </div>

      {existing?.audit && (
        <div style={sectionStyle}>
          <h2 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>Audit</h2>
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
            {Object.entries(existing.audit)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
