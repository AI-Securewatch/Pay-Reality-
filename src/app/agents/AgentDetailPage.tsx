import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { agentsApi } from "./api";
import { AgentStatusBadge } from "./components/AgentStatusBadge";
import { HealthDot } from "./components/HealthDot";
import { LifecycleTimeline } from "./components/LifecycleTimeline";
import { describeApiError, formatStatus } from "../live/format";
import { generateKeyPair } from "../live/crypto";
import { saveAgentKeyPair } from "../live/agentKeyStore";
import type { AgentDetail } from "./types";

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-card)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--pr-text-muted)", marginBottom: 2 };
const valueStyle: React.CSSProperties = { fontSize: 13, color: "var(--pr-text-primary)" };

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value || "-"}</div>
    </div>
  );
}

export function AgentDetailPage() {
  const { agentId } = useParams();
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, boolean>>({});
  const [newOwner, setNewOwner] = useState("");
  const [newBusinessUnit, setNewBusinessUnit] = useState("");

  function load() {
    if (!agentId) return;
    agentsApi.getDetail(agentId).then(setDetail);
  }

  useEffect(load, [agentId]);

  async function runAction(fn: () => Promise<unknown>, label: string) {
    setMessage(null);
    try {
      await fn();
      load();
    } catch (e) {
      setMessage(describeApiError(e, label));
    }
  }

  async function handleRotate() {
    if (!agentId) return;
    const { publicKeyB64, privateKeyB64 } = generateKeyPair();
    await runAction(() => agentsApi.rotate(agentId, `ed25519:base64:${publicKeyB64}`), "Rotate certificate");
    saveAgentKeyPair(agentId, privateKeyB64, publicKeyB64);
  }

  async function handleVerify(eventId: string) {
    if (!agentId) return;
    const result = await agentsApi.verifyAuditEvent(agentId, eventId);
    setVerifyResults((prev) => ({ ...prev, [eventId]: result.valid }));
  }

  if (!detail) return <div className="p-8" style={{ color: "var(--pr-text-muted)" }}>Loading...</div>;

  const { agent } = detail;
  const activeCert = detail.certificates.find((c) => c.status === "active");

  return (
    <div className="p-8 max-w-4xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to="/authority" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>&lt; Back to Authority</Link>

      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 style={{ color: "var(--pr-text-primary)" }}>{agent.name}</h1>
        <AgentStatusBadge status={agent.status} />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <HealthDot health={agent.health} />
        <span style={{ fontSize: 12, color: "var(--pr-text-disabled)", fontFamily: "monospace" }}>{agent.id}</span>
      </div>

      {message && <p role="alert" className="text-sm mb-4" style={{ color: "var(--pr-critical-red)" }}>{message}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        {(agent.status === "registered" || agent.status === "suspended") && (
          <button onClick={() => runAction(() => agentsApi.activate(agentId!), "Activate")} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "var(--pr-trust-green)" }}>Activate</button>
        )}
        {agent.status === "active" && (
          <button onClick={() => runAction(() => agentsApi.suspend(agentId!), "Suspend")} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--pr-warning-amber)" }}>Suspend</button>
        )}
        {(agent.status === "active" || agent.status === "suspended") && (
          <button onClick={handleRotate} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(77,124,254,0.1)", color: "var(--pr-authority-blue)" }}>Rotate certificate</button>
        )}
        {(agent.status === "registered" || agent.status === "active" || agent.status === "suspended") && (
          <>
            <button onClick={() => runAction(() => agentsApi.retire(agentId!), "Retire")} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--pr-text-secondary)" }}>Retire</button>
            <button onClick={() => runAction(() => agentsApi.revoke(agentId!), "Revoke")} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--pr-critical-red)" }}>Revoke</button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={cardStyle}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Identity</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Principal" value={detail.principal_name} />
            <Field label="Owner" value={agent.owner} />
            <Field label="Business unit" value={agent.business_unit} />
            <Field label="Environment" value={agent.environment} />
            <Field label="Description" value={agent.description} />
            <Field label="Purpose" value={agent.purpose} />
            <Field label="Model" value={agent.model} />
            <Field label="Version" value={agent.version} />
            <Field label="Runtime" value={agent.runtime} />
            <Field label="Platform" value={agent.platform} />
          </div>
          {agent.tags.length > 0 && (
            <div className="mt-3">
              <div style={labelStyle}>Tags</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {agent.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", color: "var(--pr-text-secondary)" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>SDK &amp; heartbeat</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="SDK version" value={agent.sdk_version} />
            <Field label="Last seen" value={agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : null} />
          </div>
          <p style={{ fontSize: 12, color: "var(--pr-text-muted)" }}>
            Reported by <code style={{ fontFamily: "monospace" }}>agent.heartbeat()</code> in the Python SDK
            (SDK_AGENT_GUIDE.md). No manual update here: this section reflects whatever the agent itself
            last reported.
          </p>

          <h3 className="text-xs font-medium mt-4 mb-2" style={{ color: "var(--pr-text-primary)" }}>Transfer ownership</h3>
          <div className="flex gap-2">
            <input
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder="New owner"
              aria-label="New owner"
              className="px-2 py-1.5 rounded-lg border text-xs flex-1"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
            <input
              value={newBusinessUnit}
              onChange={(e) => setNewBusinessUnit(e.target.value)}
              placeholder="New business unit (optional)"
              aria-label="New business unit"
              className="px-2 py-1.5 rounded-lg border text-xs flex-1"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
            <button
              onClick={() => runAction(() => agentsApi.transfer(agentId!, newOwner, newBusinessUnit || undefined), "Transfer")}
              disabled={!newOwner.trim()}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
              style={{ backgroundColor: "rgba(77,124,254,0.1)", color: "var(--pr-authority-blue)" }}
            >
              Transfer
            </button>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Certificates</h2>
        <table className="w-full text-xs" style={{ color: "var(--pr-text-primary)" }}>
          <thead>
            <tr style={{ color: "var(--pr-text-muted)", textAlign: "left" }}>
              <th className="pb-2">Status</th>
              <th className="pb-2">Issued</th>
              <th className="pb-2">Activated</th>
              <th className="pb-2">Rotated</th>
              <th className="pb-2">Expires/Revoked</th>
            </tr>
          </thead>
          <tbody>
            {detail.certificates.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="py-2">{formatStatus(c.status)}{c.id === activeCert?.id ? " (current)" : ""}</td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>{new Date(c.issued_at).toLocaleDateString()}</td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>{c.activated_at ? new Date(c.activated_at).toLocaleDateString() : "-"}</td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>{c.rotated_at ? new Date(c.rotated_at).toLocaleDateString() : "-"}</td>
                <td className="py-2" style={{ color: "var(--pr-text-muted)" }}>
                  {(c.expires_at || c.revoked_at) ? new Date((c.expires_at ?? c.revoked_at)!).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={cardStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Rules</h2>
        {detail.policies.length === 0 && <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>No rules target this agent's principal yet.</p>}
        {detail.policies.map((p) => (
          <div key={p.policy_key} className="flex items-center justify-between py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
            <Link to={`/policy-studio/${p.policy_key}`} style={{ color: "var(--pr-authority-blue)" }}>{p.name || p.policy_key}</Link>
            <span style={{ color: "var(--pr-text-muted)" }}>v{p.version} &middot; {formatStatus(p.status)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={cardStyle}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Decision history</h2>
          {detail.recent_decisions.length === 0 && <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>No decisions yet.</p>}
          {detail.recent_decisions.map((d) => (
            <div key={d.id} className="py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--pr-text-primary)" }}>{formatStatus(d.outcome)}</span>
                <span style={{ fontSize: 11, color: "var(--pr-text-disabled)" }}>{new Date(d.created_at).toLocaleString()}</span>
              </div>
              {d.reason && <div style={{ color: "var(--pr-text-muted)", fontSize: 12 }}>{d.reason}</div>}
            </div>
          ))}
          <Link to="/decisions" style={{ color: "var(--pr-authority-blue)", fontSize: 12, display: "inline-block", marginTop: 8 }}>Submit a new decision &rarr;</Link>
        </div>

        <div style={cardStyle}>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Evidence</h2>
          {detail.recent_evidence.length === 0 && <p style={{ fontSize: 13, color: "var(--pr-text-muted)" }}>No evidence yet.</p>}
          {detail.recent_evidence.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
              <span style={{ color: "var(--pr-text-primary)" }}>{formatStatus(e.status)}</span>
              <span style={{ fontSize: 11, color: "var(--pr-text-disabled)" }}>{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
          <Link to="/evidence" style={{ color: "var(--pr-authority-blue)", fontSize: 12, display: "inline-block", marginTop: 8 }}>View all Evidence &rarr;</Link>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>Lifecycle timeline &amp; audit</h2>
        <LifecycleTimeline events={detail.recent_audit_events} />
        {detail.recent_audit_events.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium mb-2" style={{ color: "var(--pr-text-muted)" }}>Verify a signed event</h3>
            {detail.recent_audit_events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center gap-2 py-1" style={{ fontSize: 12 }}>
                <span style={{ color: "var(--pr-text-muted)", fontFamily: "monospace" }}>{event.event_type}</span>
                <button
                  onClick={() => handleVerify(event.id)}
                  className="px-2 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--pr-text-secondary)" }}
                >
                  Verify
                </button>
                {verifyResults[event.id] !== undefined && (
                  <span style={{ color: verifyResults[event.id] ? "var(--pr-trust-green)" : "var(--pr-critical-red)" }}>
                    {verifyResults[event.id] ? "Valid signature" : "INVALID"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
