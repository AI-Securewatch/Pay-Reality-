import { useId, useState } from "react";
import { Link } from "react-router";
import { aiPolicyBuilderApi } from "../api";
import type { Candidate, ValidationErrorItem } from "../types";
import type { RuntimePolicyRequest } from "../../policy-studio/types";
import { ScopeFields } from "../../policy-studio/components/ScopeFields";
import { ConditionRow } from "../../policy-studio/components/ConditionRow";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ApiError } from "../../live/apiClient";
import { describeApiError, formatStatus } from "../../live/format";
import { track } from "../../services/analytics";

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

// Shared between the single-document AI Policy Builder review page and
// the multi-document AI Authority Builder's corpus review page: a
// candidate's content is always the same RuntimePolicyRequest shape
// regardless of which upload path produced it (RUNTIME_POLICY_MAPPING.md,
// AI_AUTHORITY_BUILDER_ARCHITECTURE.md).
export function CandidateCard({ candidate, onChanged }: { candidate: Candidate; onChanged: () => void }) {
  const [content, setContent] = useState<RuntimePolicyRequest>(candidate.content);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrorItem[]>([]);
  const [tagInput, setTagInput] = useState("");
  const formId = useId();

  const readOnly = candidate.status !== "pending_review";

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await aiPolicyBuilderApi.editCandidate(candidate.candidate_id, content);
      setMessage("Saved.");
    } catch (e) {
      setMessage(describeApiError(e, "Save"));
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    setSaving(true);
    try {
      await aiPolicyBuilderApi.dismissCandidate(candidate.candidate_id);
      onChanged();
    } catch (e) {
      setMessage(describeApiError(e, "Dismiss"));
    } finally {
      setSaving(false);
    }
  }

  async function promote() {
    setSaving(true);
    setMessage(null);
    setErrors([]);
    try {
      await aiPolicyBuilderApi.editCandidate(candidate.candidate_id, content);
      const result = await aiPolicyBuilderApi.promoteCandidate(candidate.candidate_id);
      track("Runtime Policy Generated", { policy_id: result.policy_key, source: "ai_candidate" });
      setMessage(`Promoted to Policy Studio as a draft (v${result.version}).`);
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === "object" && "errors" in (e.body as object)) {
        setErrors((e.body as { errors: ValidationErrorItem[] }).errors);
      } else {
        setMessage(describeApiError(e, "Promote"));
      }
    } finally {
      setSaving(false);
    }
  }

  function addCondition() {
    setContent((c) => ({ ...c, conditions: [...c.conditions, { field: "", operator: "==", value: "" }] }));
  }
  function updateCondition(i: number, next: RuntimePolicyRequest["conditions"][number]) {
    setContent((c) => ({ ...c, conditions: c.conditions.map((cond, idx) => (idx === i ? next : cond)) }));
  }
  function removeCondition(i: number) {
    setContent((c) => ({ ...c, conditions: c.conditions.filter((_, idx) => idx !== i) }));
  }
  function addTag() {
    if (!tagInput.trim()) return;
    setContent((c) => ({ ...c, metadata: { ...c.metadata, tags: [...c.metadata.tags, tagInput.trim()] } }));
    setTagInput("");
  }
  function removeTag(tag: string) {
    setContent((c) => ({ ...c, metadata: { ...c.metadata, tags: c.metadata.tags.filter((t) => t !== tag) } }));
  }

  return (
    <div
      style={{
        backgroundColor: "var(--pr-bg-card)",
        border: "1px solid var(--pr-overlay-05)",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <input
          aria-label="Policy name"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 500, maxWidth: 400 }}
          value={content.name}
          readOnly={readOnly}
          onChange={(e) => setContent((c) => ({ ...c, name: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={candidate.confidence} />
          <span style={{ fontSize: 12, color: "var(--pr-text-muted)" }}>{formatStatus(candidate.status)}</span>
        </div>
      </div>

      {candidate.source_excerpt && (
        <p
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--pr-text-muted)",
            marginBottom: 8,
            borderLeft: "2px solid var(--pr-authority-blue)",
            paddingLeft: 8,
          }}
        >
          "{candidate.source_excerpt}" ({candidate.source_location})
        </p>
      )}

      {candidate.missing_fields.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {candidate.missing_fields.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 12,
                color: "var(--pr-warning-amber)",
                border: "1px solid var(--pr-warning-amber)",
                borderRadius: 999,
                padding: "1px 8px",
              }}
            >
              Missing: {f}
            </span>
          ))}
        </div>
      )}

      <div className="mb-3">
        <ScopeFields scope={content.scope} onChange={(scope) => setContent((c) => ({ ...c, scope }))} />
      </div>

      <label style={labelStyle}>Conditions</label>
      {content.conditions.map((cond, i) => (
        <ConditionRow
          key={i}
          condition={cond}
          readOnly={readOnly}
          onChange={(next) => updateCondition(i, next)}
          onRemove={() => removeCondition(i)}
        />
      ))}
      {!readOnly && (
        <button onClick={addCondition} style={{ color: "var(--pr-authority-blue)", fontSize: 12, marginBottom: 10 }}>
          + Add condition
        </button>
      )}

      <div className="grid grid-cols-3 gap-4 mb-3 mt-2">
        <div>
          <label htmlFor={`${formId}-effect`} style={labelStyle}>Effect</label>
          <select
            id={`${formId}-effect`}
            style={inputStyle}
            value={content.effect}
            disabled={readOnly}
            onChange={(e) => setContent((c) => ({ ...c, effect: e.target.value }))}
          >
            <option value="allow">allow</option>
            <option value="deny">deny</option>
            <option value="require_human_review">require_human_review</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-risk`} style={labelStyle}>Risk level</label>
          <select
            id={`${formId}-risk`}
            style={inputStyle}
            value={content.constraints.risk_level ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              setContent((c) => ({
                ...c,
                constraints: { ...c.constraints, risk_level: e.target.value || null },
              }))
            }
          >
            <option value="">(unset)</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-owner`} style={labelStyle}>Owner</label>
          <input
            id={`${formId}-owner`}
            style={inputStyle}
            value={content.metadata.owner ?? ""}
            readOnly={readOnly}
            onChange={(e) => setContent((c) => ({ ...c, metadata: { ...c.metadata, owner: e.target.value || null } }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {content.metadata.tags.map((t) => (
          <span
            key={t}
            style={{ fontSize: 11, color: "var(--pr-text-secondary)", backgroundColor: "var(--pr-bg-hover)", borderRadius: 999, padding: "2px 8px" }}
          >
            {t}
            {!readOnly && (
              <button
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                style={{ color: "var(--pr-critical-red)", marginLeft: 6, padding: "2px 4px" }}
              >
                x
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <>
            <input
              aria-label="New tag"
              style={{ ...inputStyle, width: 120 }}
              placeholder="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <button onClick={addTag} style={{ color: "var(--pr-authority-blue)", fontSize: 12, padding: "6px 8px" }}>
              + Add tag
            </button>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mb-3">
          {errors.map((err, i) => (
            <p key={i} style={{ fontSize: 12, color: "var(--pr-critical-red)" }}>
              {err.field}: {err.message}
            </p>
          ))}
        </div>
      )}

      {message && (
        <p role="alert" style={{ fontSize: 13, color: "var(--pr-text-secondary)", marginBottom: 8 }}>{message}</p>
      )}

      {candidate.status === "pending_review" ? (
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border"
            style={{ color: "var(--pr-text-secondary)", fontSize: 13, padding: "8px 14px", borderColor: "var(--pr-overlay-10)" }}
          >
            Save draft
          </button>
          <button
            onClick={dismiss}
            disabled={saving}
            className="rounded-lg border"
            style={{ color: "var(--pr-critical-red)", fontSize: 13, padding: "8px 14px", borderColor: "rgba(239,68,68,0.3)" }}
          >
            Dismiss
          </button>
          <button
            onClick={promote}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
          >
            Promote to Policy Studio
          </button>
        </div>
      ) : candidate.status === "promoted" && candidate.promoted_policy_key ? (
        <Link to={`/governance/${candidate.promoted_policy_key}`} style={{ color: "var(--pr-trust-green)", fontSize: 13 }}>
          View in Policy Studio
        </Link>
      ) : (
        <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>Dismissed.</p>
      )}
    </div>
  );
}
