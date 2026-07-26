import { useEffect, useState } from "react";
import { policyStudioApi } from "../api";
import type { Scope } from "../types";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-hover)",
  border: "1px solid rgba(255,255,255,0.1)",
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

// Action is a dropdown fetched from the live vocabulary endpoint, never
// a second hardcoded copy of KNOWN_SCOPES in this file: the exact drift
// bug DOMAIN_REFACTOR_PLAN.md's item 5 already named for the existing
// Runtime Decisions page.
export function ScopeFields({ scope, onChange }: { scope: Scope; onChange: (next: Scope) => void }) {
  const [actions, setActions] = useState<string[]>([]);

  useEffect(() => {
    policyStudioApi
      .getVocabulary()
      .then((v) => setActions(v.actions))
      .catch(() => setActions([]));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label style={labelStyle}>Principal</label>
        <input
          style={inputStyle}
          value={scope.principal}
          onChange={(e) => onChange({ ...scope, principal: e.target.value })}
          placeholder="principal id"
        />
      </div>
      <div>
        <label style={labelStyle}>Action</label>
        <select style={inputStyle} value={scope.action} onChange={(e) => onChange({ ...scope, action: e.target.value })}>
          <option value="">(select an action)</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Agent (optional)</label>
        <input
          style={inputStyle}
          value={scope.agent ?? ""}
          onChange={(e) => onChange({ ...scope, agent: e.target.value || null })}
          placeholder="(any agent for this principal)"
        />
      </div>
      <div>
        <label style={labelStyle}>Resource (optional)</label>
        <input
          style={inputStyle}
          value={scope.resource ?? ""}
          onChange={(e) => onChange({ ...scope, resource: e.target.value || null })}
        />
      </div>
    </div>
  );
}
