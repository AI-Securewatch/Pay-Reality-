import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";
import { formatStatus } from "../live/format";
import { OPERATOR_LABEL } from "./describePolicy";
import type { PolicyDiff, RuntimePolicy } from "./types";

// Replaces the separate Version History and Diff pages
// (PAYREALITY_UX_REVIEW.md, "Fold Version History and Diff into one
// page"): selecting two versions expands the comparison inline, on the
// same page, instead of navigating to a second URL.

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

export function VersionsPage() {
  const { policyKey } = useParams();
  const [versions, setVersions] = useState<RuntimePolicy[] | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [diff, setDiff] = useState<PolicyDiff | null>(null);

  useEffect(() => {
    policyStudioApi.getVersions(policyKey!).then(setVersions);
  }, [policyKey]);

  useEffect(() => {
    setDiff(null);
    if (selected && selected[0] !== selected[1]) {
      const [from, to] = [Math.min(...selected), Math.max(...selected)];
      policyStudioApi.diff(policyKey!, from, to).then(setDiff);
    }
  }, [policyKey, selected]);

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <h1 className="mt-2 mb-2" style={{ color: "var(--pr-text-primary)" }}>History</h1>
      <p style={{ color: "var(--pr-text-muted)", fontSize: 12, marginBottom: 16 }}>
        Select any two versions to compare what changed between them.
      </p>

      {versions?.map((v) => (
        <div
          key={v.version}
          className="flex items-center justify-between py-2"
          style={{ borderTop: "1px solid var(--pr-overlay-05)", fontSize: 13 }}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              aria-label={`Select version ${v.version} for comparison`}
              checked={!!selected && selected.includes(v.version)}
              onChange={(e) => {
                setSelected((prev) => {
                  const withoutV = (prev ?? []).filter((x) => x !== v.version);
                  if (!e.target.checked) return withoutV.length ? [withoutV[0], withoutV[0]] : null;
                  const next = [...withoutV, v.version].slice(-2);
                  return next.length === 2 ? [next[0], next[1]] : [next[0], next[0]];
                });
              }}
            />
            <span style={{ color: "var(--pr-text-primary)" }}>v{v.version}</span>
            <PolicyStatusBadge status={v.status} />
            <span style={{ color: "var(--pr-text-muted)" }}>{new Date(v.created_at).toLocaleString()}</span>
          </div>
          {v.status !== "active" && (
            <span style={{ color: "var(--pr-text-muted)" }}>
              (rollback: edit and republish this version once checked for errors)
            </span>
          )}
        </div>
      ))}

      {selected && selected[0] !== selected[1] && (
        <div className="mt-6">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>
            Comparing v{Math.min(...selected)} &rarr; v{Math.max(...selected)}
          </h2>

          {!diff && <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>Loading comparison...</p>}

          {diff && (
            <>
              <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Conditions</h3>
                {diff.conditions.map((c, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: KIND_COLOR[c.kind], textTransform: "uppercase", fontSize: 11, marginRight: 8 }}>
                      {c.kind}
                    </span>
                    <span style={{ color: "var(--pr-text-secondary)" }}>
                      {c.field} {OPERATOR_LABEL[c.operator] ?? c.operator}{" "}
                      {c.kind === "modified"
                        ? `${JSON.stringify(c.old_value)} -> ${JSON.stringify(c.new_value)}`
                        : JSON.stringify(c.new_value ?? c.old_value)}
                    </span>
                  </div>
                ))}
                {diff.conditions.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>No condition changes.</p>
                )}

                <div className="mt-3 text-sm" style={{ color: "var(--pr-text-muted)" }}>
                  <p>Who/what this applies to {diff.scope_changed ? "changed" : "unchanged"}</p>
                  <p>Outcome {diff.effect_changed ? "changed" : "unchanged"}</p>
                  <p>Constraints {diff.constraints_changed ? "changed" : "unchanged"}</p>
                </div>
              </div>

              <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>
                  Affected agents ({diff.affected_agents.length})
                </h3>
                {diff.affected_agents.map((a) => (
                  <p key={a.id} style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
                    <Link to="/authority" style={{ color: "var(--pr-authority-blue)" }}>{a.name}</Link>
                  </p>
                ))}
                {diff.affected_agents.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>None found for this rule's principal.</p>
                )}
              </div>

              <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>
                  Other affected rules ({diff.affected_policies.length})
                </h3>
                {diff.affected_policies.map((p) => (
                  <p key={p.policy_key} style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>
                    <Link to={`/policy-studio/${p.policy_key}`} style={{ color: "var(--pr-authority-blue)" }}>{p.name}</Link>{" "}
                    (v{p.version}, {formatStatus(p.status)}){p.same_action ? "" : ", different action, listed for awareness only"}
                  </p>
                ))}
                {diff.affected_policies.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>None share this rule's principal.</p>
                )}
              </div>

              <div style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)", borderRadius: 12, padding: 20 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>
                  Risk impact:{" "}
                  <span style={{ color: RISK_COLOR[diff.risk_impact], textTransform: "uppercase" }}>{diff.risk_impact}</span>
                </h3>
                <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>{diff.risk_reason}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
