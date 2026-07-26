import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { Condition, Constraints, Effect, Metadata, RuntimePolicy, RuntimePolicyRequest, Scope } from "./types";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";
import { ConditionRow } from "./components/ConditionRow";
import { ScopeFields } from "./components/ScopeFields";
import { ApiError } from "../live/apiClient";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-hover)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "var(--pr-text-primary)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--pr-text-muted)", display: "block", marginBottom: 4 };
const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-card)",
  border: "1px solid rgba(255,255,255,0.05)",
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
  constraints: { delegated_by: null, expires: null, evidence_required: true, risk_level: null },
  metadata: { owner: null, created_by: null, tags: [] },
};

export function PolicyWorkspacePage() {
  const { policyKey } = useParams();
  const isNew = !policyKey || policyKey === "new";
  const navigate = useNavigate();

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
    try {
      const saved = isNew ? await policyStudioApi.create(form) : await policyStudioApi.edit(policyKey!, form);
      setMessage(`Saved as draft, v${saved.version}.`);
      if (isNew) navigate(`/policy-studio/${saved.policy_key}`);
      else setExisting(saved);
    } catch (e) {
      setMessage(e instanceof ApiError ? `Save failed: ${JSON.stringify(e.body)}` : "Save failed.");
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
      setMessage(e instanceof ApiError ? `Submit failed: ${JSON.stringify(e.body)}` : "Submit failed.");
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
        <Link to="/policy-studio" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
          &lt; Back to Policy List
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <h1 style={{ color: "var(--pr-text-primary)" }}>{form.name || "New Policy"}</h1>
        {existing && (
          <>
            <span style={{ color: "var(--pr-text-disabled)" }}>v{existing.version}</span>
            <PolicyStatusBadge status={existing.status} />
          </>
        )}
      </div>

      {message && <p style={{ color: "var(--pr-text-secondary)", marginBottom: 16 }}>{message}</p>}

      {existing && (
        <div className="mb-4 flex gap-3 text-sm">
          <Link to={`/policy-studio/${policyKey}/versions`} style={{ color: "var(--pr-authority-blue)" }}>
            Version History
          </Link>
          {existing.status === "draft" && (
            <button onClick={handleSubmitForReview} disabled={saving} style={{ color: "var(--pr-authority-blue)" }}>
              Submit for Review
            </button>
          )}
          {existing.status === "approved" && (
            <Link to={`/policy-studio/${policyKey}/compile`} style={{ color: "var(--pr-authority-blue)" }}>
              Compile
            </Link>
          )}
          {(existing.status === "compiled" || existing.status === "active") && (
            <Link to={`/policy-studio/${policyKey}/dry-run`} style={{ color: "var(--pr-authority-blue)" }}>
              Dry Run
            </Link>
          )}
          {existing.status === "compiled" && (
            <Link to={`/policy-studio/${policyKey}/deploy`} style={{ color: "var(--pr-authority-blue)" }}>
              Deploy
            </Link>
          )}
        </div>
      )}

      <div style={sectionStyle}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Identity</h3>
        <label style={labelStyle}>Name</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <label style={labelStyle}>Description</label>
        <input
          style={inputStyle}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div style={sectionStyle}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Scope</h3>
        <ScopeFields scope={form.scope} onChange={updateScope} />
      </div>

      <div style={sectionStyle}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
            Conditions (all must hold)
          </h3>
          <button onClick={addCondition} style={{ color: "var(--pr-authority-blue)", fontSize: 13 }}>
            + Add condition
          </button>
        </div>
        {form.conditions.map((c, i) => (
          <ConditionRow key={i} condition={c} onChange={(next) => updateCondition(i, next)} onRemove={() => removeCondition(i)} />
        ))}
        {form.conditions.length === 0 && (
          <p style={{ color: "var(--pr-text-disabled)", fontSize: 13 }}>No conditions yet: this policy matches on scope alone.</p>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Constraints</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Delegated by</label>
            <input
              style={inputStyle}
              value={form.constraints.delegated_by ?? ""}
              onChange={(e) => updateConstraints({ ...form.constraints, delegated_by: e.target.value || null })}
            />
          </div>
          <div>
            <label style={labelStyle}>Risk level</label>
            <select
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
      </div>

      <div style={sectionStyle}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Effect</h3>
        <div className="flex gap-4">
          {(["allow", "deny", "require_human_review"] as Effect[]).map((eff) => (
            <label key={eff} className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
              <input type="radio" checked={form.effect === eff} onChange={() => setForm((f) => ({ ...f, effect: eff }))} />
              {eff}
            </label>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Metadata</h3>
        <label style={labelStyle}>Owner</label>
        <input
          style={{ ...inputStyle, marginBottom: 10 }}
          value={form.metadata.owner ?? ""}
          onChange={(e) => updateMetadata({ ...form.metadata, owner: e.target.value || null })}
        />
        <label style={labelStyle}>Tags</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {form.metadata.tags.map((t) => (
            <span key={t} style={{ ...inputStyle, width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t}
              <button onClick={() => removeTag(t)} style={{ color: "var(--pr-critical-red)" }}>
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input style={inputStyle} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="new tag" />
          <button onClick={addTag} style={{ color: "var(--pr-authority-blue)", fontSize: 13 }}>
            + Add tag
          </button>
        </div>
      </div>

      {existing?.audit && (
        <div style={sectionStyle}>
          <h3 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>Audit</h3>
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
