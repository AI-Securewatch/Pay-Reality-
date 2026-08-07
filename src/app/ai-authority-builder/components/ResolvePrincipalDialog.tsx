import { useEffect, useState } from "react";
import { aiAuthorityBuilderApi } from "../api";
import { describeApiError } from "../../live/format";
import { ApiError } from "../../live/apiClient";
import type { Principal, PrincipalCandidate } from "../types";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-hover)",
  border: "1px solid var(--pr-overlay-10)",
  color: "var(--pr-text-primary)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--pr-text-muted)",
  display: "block",
  marginBottom: 4,
};

interface ResolvePrincipalDialogProps {
  authorityPrincipalId: string;
  discoveryName: string;
  discoveryRole: string | null;
  onResolved: (resolved: Principal) => void;
  onClose: () => void;
}

// Stage I.2: the reviewer workflow's step two. Step one (candidates,
// suggest-only) loads on mount; resolving is the only call that
// actually sets AuthorityPrincipal.resolved_principal_id, and it is
// gated server-side by AUTHORITY_REVIEW exactly like every other
// consequential reviewed action in this app.
export function ResolvePrincipalDialog({
  authorityPrincipalId,
  discoveryName,
  discoveryRole,
  onResolved,
  onClose,
}: ResolvePrincipalDialogProps) {
  const [candidates, setCandidates] = useState<PrincipalCandidate[] | null>(null);
  const [mode, setMode] = useState<"match" | "create">("match");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createName, setCreateName] = useState(discoveryName);
  const [createRole, setCreateRole] = useState(discoveryRole ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aiAuthorityBuilderApi
      .getPrincipalCandidates(authorityPrincipalId)
      .then((list) => {
        setCandidates(list);
        // Empty list is a valid, common answer (Stage E's own design: no
        // existing Principal matches by name) -- default straight to
        // Create rather than leaving the reviewer on an empty Match view.
        if (list.length === 0) setMode("create");
      })
      .catch(() => setCandidates([]));
  }, [authorityPrincipalId]);

  async function handleResolve() {
    setError(null);
    if (mode === "match" && !selectedId) {
      setError("Select a candidate, or switch to Create new principal.");
      return;
    }
    if (mode === "create" && !createName.trim()) {
      setError("Enter a name for the new principal.");
      return;
    }
    setSubmitting(true);
    try {
      const resolved = await aiAuthorityBuilderApi.resolvePrincipal(authorityPrincipalId, {
        action: mode,
        principal_id: mode === "match" ? selectedId : undefined,
        name: mode === "create" ? createName.trim() : undefined,
        role: mode === "create" ? createRole.trim() || undefined : undefined,
      });
      onResolved(resolved);
      onClose();
    } catch (e) {
      // Mirrors the backend exactly: AlreadyResolvedError is the one
      // outcome this dialog can't let the reviewer retry past, since
      // resolution is a one-way, non-overwritable action (Stage E).
      if (e instanceof ApiError && e.status === 409) {
        setError("This principal has already been resolved.");
      } else {
        setError(describeApiError(e, "Resolve"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Resolve principal: ${discoveryName}`}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--pr-bg-card)",
          border: "1px solid var(--pr-overlay-10)",
          borderRadius: 12,
          padding: 24,
          width: 420,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--pr-text-primary)", marginBottom: 4 }}>
          Resolve principal
        </h2>
        <p style={{ fontSize: 12, color: "var(--pr-text-muted)", marginBottom: 16 }}>
          Discovered as "{discoveryName}"{discoveryRole ? `, ${discoveryRole}` : ""}. Match it to an
          existing Principal, or create a new one.
        </p>

        {candidates === null && <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>Loading candidates...</p>}

        {candidates !== null && candidates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={labelStyle}>Match an existing principal</p>
            {candidates.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2"
                style={{ fontSize: 13, color: "var(--pr-text-secondary)", padding: "6px 0" }}
              >
                <input
                  type="radio"
                  name="resolve-principal-mode"
                  checked={mode === "match" && selectedId === c.id}
                  onChange={() => {
                    setMode("match");
                    setSelectedId(c.id);
                  }}
                />
                {c.name}
                {c.role ? `, ${c.role}` : ""}
              </label>
            ))}
          </div>
        )}

        <div
          style={{
            marginBottom: 16,
            paddingTop: candidates?.length ? 12 : 0,
            borderTop: candidates?.length ? "1px solid var(--pr-overlay-05)" : undefined,
          }}
        >
          <label
            className="flex items-center gap-2"
            style={{ fontSize: 13, color: "var(--pr-text-secondary)", marginBottom: 10 }}
          >
            <input
              type="radio"
              name="resolve-principal-mode"
              checked={mode === "create"}
              onChange={() => setMode("create")}
            />
            Create new principal
          </label>
          {mode === "create" && (
            <div style={{ paddingLeft: 22 }}>
              <label htmlFor="resolve-create-name" style={labelStyle}>Name</label>
              <input
                id="resolve-create-name"
                style={{ ...inputStyle, marginBottom: 10 }}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <label htmlFor="resolve-create-role" style={labelStyle}>Role</label>
              <input
                id="resolve-create-role"
                style={inputStyle}
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--pr-critical-red)", fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ color: "var(--pr-text-muted)", fontSize: 13, padding: "6px 12px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={submitting}
            className="rounded-lg"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff", fontSize: 13, padding: "6px 14px" }}
          >
            {submitting ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}
