import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { policyStudioApi } from "./api";
import type { RuntimePolicy } from "./types";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";

type SortKey = "name" | "version" | "status" | "created_at" | "owner";

export function PolicyListPage() {
  const [policies, setPolicies] = useState<RuntimePolicy[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");

  useEffect(() => {
    policyStudioApi
      .list()
      .then(setPolicies)
      .catch(() => setError(true));
  }, []);

  const visible = useMemo(() => {
    if (!policies) return [];
    let rows = policies;
    if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "version") return b.version - a.version;
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "owner") return (a.metadata.owner ?? "").localeCompare(b.metadata.owner ?? "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [policies, search, statusFilter, sortKey]);

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 style={{ color: "var(--pr-text-primary)" }}>Policy Studio</h1>
        <div className="flex items-center gap-3">
          <Link to="/policy-studio/review-queue" style={{ color: "var(--pr-authority-blue)", fontSize: 13 }}>
            Review Queue
          </Link>
          <Link
            to="/policy-studio/new"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
          >
            + New Policy
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          style={{
            backgroundColor: "var(--pr-bg-hover)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--pr-text-primary)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
            width: 260,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            backgroundColor: "var(--pr-bg-hover)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--pr-text-primary)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
          }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="compiled">Compiled</option>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            backgroundColor: "var(--pr-bg-hover)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--pr-text-primary)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
          }}
        >
          <option value="created_at">Last modified</option>
          <option value="name">Name</option>
          <option value="version">Version</option>
          <option value="status">Status</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      {error && (
        <p style={{ color: "var(--pr-warning-amber)" }}>Could not reach the Policy Studio backend.</p>
      )}

      {policies && (
        <table className="w-full text-sm" style={{ color: "var(--pr-text-primary)" }}>
          <thead>
            <tr style={{ color: "var(--pr-text-muted)", textAlign: "left", fontSize: 12 }}>
              <th className="pb-2">Name</th>
              <th className="pb-2">Version</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Last Modified</th>
              <th className="pb-2">Owner</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.policy_key} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="py-2">
                  <Link to={`/policy-studio/${p.policy_key}`} style={{ color: "var(--pr-authority-blue)" }}>
                    {p.name}
                  </Link>
                </td>
                <td className="py-2">v{p.version}</td>
                <td className="py-2">
                  <PolicyStatusBadge status={p.status} />
                </td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>
                  {p.metadata.owner ?? "N/A"}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center" style={{ color: "var(--pr-text-disabled)" }}>
                  No policies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
