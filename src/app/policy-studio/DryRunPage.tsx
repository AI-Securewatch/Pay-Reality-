import { useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { DryRunResult } from "./types";
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

export function DryRunPage() {
  const { policyKey } = useParams();
  const [principal, setPrincipal] = useState("");
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [contextText, setContextText] = useState('{"amount": 75000, "currency": "ZAR"}');
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    let context: Record<string, unknown> = {};
    try {
      context = contextText.trim() ? JSON.parse(contextText) : {};
    } catch {
      setError("Context is not valid JSON.");
      setRunning(false);
      return;
    }
    try {
      const r = await policyStudioApi.dryRun(policyKey!, { principal, action, resource: resource || undefined, context });
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? `Dry run failed: ${JSON.stringify(e.body)}` : "Dry run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <h1 className="mt-2 mb-6" style={{ color: "var(--pr-text-primary)" }}>Dry Run</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label style={labelStyle}>Principal</label>
          <input style={inputStyle} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Action</label>
          <input style={inputStyle} value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Resource (optional)</label>
          <input style={inputStyle} value={resource} onChange={(e) => setResource(e.target.value)} />
        </div>
      </div>
      <label style={labelStyle}>Context (JSON)</label>
      <textarea
        style={{ ...inputStyle, height: 80, fontFamily: "monospace", marginBottom: 12 }}
        value={contextText}
        onChange={(e) => setContextText(e.target.value)}
      />

      <button
        onClick={run}
        disabled={running}
        className="px-4 py-2 rounded-lg text-sm font-medium mb-6"
        style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
      >
        {running ? "Running..." : "Run Dry Run"}
      </button>

      {error && <p style={{ color: "var(--pr-critical-red)" }}>{error}</p>}

      {result && (
        <div
          style={{
            backgroundColor: "var(--pr-bg-card)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <p style={{ color: "var(--pr-text-primary)" }}>
            Decision: <strong>{result.decision}</strong>
          </p>
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
            Reason: {result.review_reason ?? result.deny_reason ?? "(none, matched cleanly)"}
          </p>
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
            Evidence required: {result.evidence_required ? "yes" : "no"}
          </p>
          <p style={{ color: "var(--pr-text-disabled)", fontSize: 12, marginTop: 8 }}>
            This does not affect the active bundle. Run as many times as needed.
          </p>
        </div>
      )}
    </div>
  );
}
