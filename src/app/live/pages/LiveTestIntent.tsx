import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Send, ShieldAlert, XCircle } from "lucide-react";
import { apiClient, ApiError } from "../apiClient";
import { signBody } from "../crypto";
import { getAgentPrivateKey } from "../agentKeyStore";
import type { LiveAgent, LiveDecision, SubmitIntentResult } from "../types";

const KNOWN_SCOPES = ["vendor_payment", "purchase_order_create", "wire_transfer"];

const OUTCOME_STYLE: Record<string, { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
  ALLOW: { bg: "rgba(34,197,94,0.1)", fg: "var(--pr-trust-green)", icon: CheckCircle2 },
  DENY: { bg: "rgba(239,68,68,0.1)", fg: "var(--pr-critical-red)", icon: XCircle },
  HUMAN_REVIEW: { bg: "rgba(245,158,11,0.1)", fg: "var(--pr-warning-amber)", icon: ShieldAlert },
};

export function LiveTestIntent() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [action, setAction] = useState(KNOWN_SCOPES[0]);
  const [amount, setAmount] = useState("10000");
  const [currency, setCurrency] = useState("USD");
  const [result, setResult] = useState<SubmitIntentResult | null>(null);
  const [decision, setDecision] = useState<LiveDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    apiClient.get<LiveAgent[]>("/v1/agents").then(setAgents);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const signableAgents = agents.filter((a) => getAgentPrivateKey(a.id) && a.certificate_id);

  const startPolling = (decisionId: string) => {
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      const latest = await apiClient.get<LiveDecision>(`/v1/decisions/${decisionId}`);
      setDecision(latest);
      if (latest.status === "RESOLVED" || attempts > 60) {
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    }, 2000);
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    setDecision(null);
    if (pollRef.current) window.clearInterval(pollRef.current);

    const agent = agents.find((a) => a.id === agentId);
    const privateKey = agentId ? getAgentPrivateKey(agentId) : null;
    if (!agent || !privateKey || !agent.certificate_id) {
      setError("Select an agent that was registered in this browser (Live Agents page).");
      return;
    }

    const body = {
      agent_id: agentId,
      action,
      amount: Number(amount),
      currency,
      counterparty: "vendor_772",
      context: { cost_center: "EMEA-04" },
      requested_at: new Date().toISOString(),
      nonce: crypto.randomUUID(),
    };
    const rawBody = JSON.stringify(body);
    const signature = signBody(new TextEncoder().encode(rawBody), privateKey);

    try {
      const submitted = await apiClient.postSigned<SubmitIntentResult>("/v1/intents", rawBody, {
        "X-PayReality-Key-Id": agent.certificate_id,
        "X-PayReality-Signature": signature,
      });
      setResult(submitted);
      const latest = await apiClient.get<LiveDecision>(`/v1/decisions/${submitted.decision.decision_id}`);
      setDecision(latest);
      if (submitted.status === "PENDING") startPolling(submitted.decision.decision_id);
    } catch (e) {
      setError(e instanceof ApiError ? `Submission failed: ${JSON.stringify(e.body)}` : "Submission failed.");
    }
  };

  const handleResolve = async (resolution: "approved" | "denied") => {
    if (!decision) return;
    setResolving(true);
    try {
      await apiClient.post(`/v1/decisions/${decision.id}/resolve`, {
        resolution,
        resolved_by: "CFO Jane Doe",
        reason: resolution === "approved" ? "Reviewed and approved." : "Reviewed and denied.",
      });
      const latest = await apiClient.get<LiveDecision>(`/v1/decisions/${decision.id}`);
      setDecision(latest);
    } finally {
      setResolving(false);
    }
  };

  const style = decision ? OUTCOME_STYLE[decision.outcome] : null;

  return (
    <div className="p-8 max-w-3xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Test a Decision</h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Submit a signed Intent to the real Decision Engine and watch it evaluate against the
          active Policy.
        </p>
      </div>

      <div
        className="p-6 rounded-2xl border mb-6"
        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        {signableAgents.length === 0 && (
          <p className="text-sm mb-4" style={{ color: "var(--pr-warning-amber)" }}>
            No agents with a signing key in this browser yet. Register one on the Live Agents page first.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            >
              <option value="">Select an agent…</option>
              {signableAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            >
              {KNOWN_SCOPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Currency</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!agentId}
          className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
        >
          <Send className="w-4 h-4" /> Submit signed Intent
        </button>

        {error && <p className="text-sm mt-4" style={{ color: "var(--pr-critical-red)" }}>{error}</p>}
      </div>

      {decision && style && (
        <div
          className="p-6 rounded-2xl border"
          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: style.bg }}>
              <style.icon className="w-5 h-5" style={{ color: style.fg }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: style.fg }}>{decision.outcome}</p>
              <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{decision.reason}</p>
            </div>
          </div>

          {decision.status === "PENDING" && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.06)" }}>
              <Clock className="w-4 h-4 animate-pulse" style={{ color: "var(--pr-warning-amber)" }} />
              <span className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                Awaiting human review… (polling every 2s)
              </span>
            </div>
          )}

          {decision.outcome === "HUMAN_REVIEW" && decision.status === "PENDING" && (
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve("approved")}
                disabled={resolving}
                className="flex-1 px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "var(--pr-trust-green)" }}
              >
                <CheckCircle2 className="w-4 h-4" /> Approve as CFO
              </button>
              <button
                onClick={() => handleResolve("denied")}
                disabled={resolving}
                className="flex-1 px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--pr-critical-red)" }}
              >
                <XCircle className="w-4 h-4" /> Deny as CFO
              </button>
            </div>
          )}

          {decision.resolution && (
            <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>
              Resolved <strong>{decision.resolution.resolution}</strong> by {decision.resolution.resolved_by}
            </p>
          )}

          {result && (
            <p className="text-xs mt-4 font-mono" style={{ color: "var(--pr-text-disabled)" }}>
              evidence_id: {result.evidence_id}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
