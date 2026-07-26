import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { policyStudioApi } from "./api";
import { formatStatus } from "../live/format";
import type { PolicyDiff } from "./types";

const KIND_COLOR: Record<string, string> = {
  added: "var(--pr-trust-green)",
  removed: "var(--pr-critical-red)",
  modified: "var(--pr-warning-amber)",
  unchanged: "var(--pr-text-muted)",
};

const RISK_COLOR: Record<string, string> = {
  increased: "var(--pr-critical-red)",
  decreased: "var(--pr-trust-green)",
  mixed: "var(--pr-warning-amber)",
  unchanged: "var(--pr-text-muted)",
};

export function PolicyDiffPage() {
  const { policyKey } = useParams();
  const [params] = useSearchParams();
  const from = Number(params.get("from"));
  const to = Number(params.get("to"));
  const [diff, setDiff] = useState<PolicyDiff | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    policyStudioApi.diff(policyKey!, from, to).then(setDiff);
  }, [policyKey, from, to]);

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}/versions`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back to Version History
      </Link>
      <h1 className="mt-2 mb-6" style={{ color: "var(--pr-text-primary)" }}>
        Diff: v{from} -&gt; v{to}
      </h1>

      {diff && (
        <>
          <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Conditions</h2>
            {diff.conditions.map((c, i) => (
              <div key={i} style={{ fontSize: 13, fontFamily: "monospace", marginBottom: 4 }}>
                <span style={{ color: KIND_COLOR[c.kind], textTransform: "uppercase", fontSize: 11, marginRight: 8 }}>
                  {c.kind}
                </span>
                <span style={{ color: "var(--pr-text-secondary)" }}>
                  {c.field} {c.operator}{" "}
                  {c.kind === "modified"
                    ? `${JSON.stringify(c.old_value)} -> ${JSON.stringify(c.new_value)}`
                    : JSON.stringify(c.new_value ?? c.old_value)}
                </span>
              </div>
            ))}

            <div className="mt-3 text-sm" style={{ color: "var(--pr-text-muted)" }}>
              <p>Scope {diff.scope_changed ? "changed" : "unchanged"}</p>
              <p>Effect {diff.effect_changed ? "changed" : "unchanged"}</p>
              <p>Constraints {diff.constraints_changed ? "changed" : "unchanged"}</p>
            </div>
          </div>

          <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>
              Affected Agents ({diff.affected_agents.length})
            </h2>
            {diff.affected_agents.map((a) => (
              <p key={a.id} style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
                <Link to="/authority" style={{ color: "var(--pr-authority-blue)" }}>
                  {a.name}
                </Link>
              </p>
            ))}
            {diff.affected_agents.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>None found for this policy's principal.</p>
            )}
          </div>

          <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>
              Affected Runtime Policies ({diff.affected_policies.length})
            </h2>
            {diff.affected_policies.map((p) => (
              <p key={p.policy_key} style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
                <Link to={`/policy-studio/${p.policy_key}`} style={{ color: "var(--pr-authority-blue)" }}>
                  {p.name}
                </Link>{" "}
                (v{p.version}, {formatStatus(p.status)}){p.same_action ? "" : ", different action, listed for awareness only"}
              </p>
            ))}
            {diff.affected_policies.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>None share this policy's principal.</p>
            )}
          </div>

          <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 20 }}>
            <h2 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>
              Risk Impact:{" "}
              <span style={{ color: RISK_COLOR[diff.risk_impact], textTransform: "uppercase" }}>{diff.risk_impact}</span>
            </h2>
            <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>{diff.risk_reason}</p>
          </div>
        </>
      )}
    </div>
  );
}
