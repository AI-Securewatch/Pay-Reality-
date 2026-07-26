import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { RuntimePolicy } from "./types";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";

export function VersionHistoryPage() {
  const { policyKey } = useParams();
  const [versions, setVersions] = useState<RuntimePolicy[] | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  useEffect(() => {
    policyStudioApi.getVersions(policyKey!).then(setVersions);
  }, [policyKey]);

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <h1 className="mt-2 mb-6" style={{ color: "var(--pr-text-primary)" }}>Version History</h1>

      {versions?.map((v) => (
        <div
          key={v.version}
          className="flex items-center justify-between py-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
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
            <span style={{ color: "var(--pr-text-disabled)" }}>
              (rollback: edit and redeploy this version via Deploy once compiled)
            </span>
          )}
        </div>
      ))}

      {selected && selected[0] !== selected[1] && (
        <Link
          to={`/policy-studio/${policyKey}/diff?from=${Math.min(...selected)}&to=${Math.max(...selected)}`}
          className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
        >
          Compare v{Math.min(...selected)} -&gt; v{Math.max(...selected)}
        </Link>
      )}
    </div>
  );
}
