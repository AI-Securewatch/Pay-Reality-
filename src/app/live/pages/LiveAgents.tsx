import { useEffect, useState } from "react";
import { Bot, KeyRound, Plus } from "lucide-react";
import { apiClient } from "../apiClient";
import { generateKeyPair } from "../crypto";
import { saveAgentKeyPair } from "../agentKeyStore";
import { describeApiError, formatStatus } from "../format";
import type { LiveAgent, LivePrincipal } from "../types";

export function LiveAgents() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [principals, setPrincipals] = useState<LivePrincipal[]>([]);
  const [name, setName] = useState("");
  const [principalId, setPrincipalId] = useState("");
  const [newPrincipalName, setNewPrincipalName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => {
    apiClient.get<LiveAgent[]>("/v1/agents").then(setAgents);
    apiClient.get<LivePrincipal[]>("/v1/principals").then(setPrincipals);
  };

  useEffect(refresh, []);

  const handleCreatePrincipal = async () => {
    if (!newPrincipalName.trim()) return;
    const principal = await apiClient.post<LivePrincipal>("/v1/principals", { name: newPrincipalName });
    setPrincipals((prev) => [...prev, principal]);
    setPrincipalId(principal.id);
    setNewPrincipalName("");
  };

  const handleRegister = async () => {
    if (!name.trim() || !principalId) {
      setMessage("Name and Principal are both required.");
      return;
    }
    const { publicKeyB64, privateKeyB64 } = generateKeyPair();
    try {
      const agent = await apiClient.post<LiveAgent>("/v1/agents", {
        name,
        acting_for_principal_id: principalId,
        public_key: `ed25519:base64:${publicKeyB64}`,
      });
      saveAgentKeyPair(agent.id, privateKeyB64, publicKeyB64);
      setAgents((prev) => [agent, ...prev]);
      setName("");
      setMessage(`Registered "${agent.name}". Its signing key is stored in this browser for the Test a Decision page.`);
    } catch (e) {
      setMessage(describeApiError(e, "Registration"));
    }
  };

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Live Agents</h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Register an AI agent with a signing key. The private key never leaves this browser; only
          the public key is sent to the server.
        </p>
      </div>

      <div
        className="p-6 rounded-xl border mb-8"
        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>
          Register a new agent
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="agent-name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
              Agent name
            </label>
            <input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AP-Automation-Agent"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
          </div>
          <div>
            <label htmlFor="agent-principal" className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
              Acting for principal
            </label>
            <select
              id="agent-principal"
              value={principalId}
              onChange={(e) => setPrincipalId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            >
              <option value="">Select a principal...</option>
              {principals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-2 mb-4">
          <div className="flex-1">
            <label htmlFor="new-principal-name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
              Or create a new principal
            </label>
            <input
              id="new-principal-name"
              value={newPrincipalName}
              onChange={(e) => setNewPrincipalName(e.target.value)}
              placeholder="Regional Controller (EMEA)"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
          </div>
          <button
            onClick={handleCreatePrincipal}
            className="px-4 py-2 rounded-lg text-sm border transition-all"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-secondary)" }}
          >
            Create
          </button>
        </div>

        <button
          onClick={handleRegister}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> Register agent
        </button>

        {message && (
          <p role="alert" className="text-sm mt-4" style={{ color: "var(--pr-text-secondary)" }}>
            {message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {agents.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl border flex items-center justify-between"
            style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(77,124,254,0.1)" }}>
                <Bot className="w-4.5 h-4.5" style={{ color: "var(--pr-authority-blue)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>{a.name}</p>
                <p className="text-xs font-mono" style={{ color: "var(--pr-text-muted)" }}>{a.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" style={{ color: "var(--pr-text-disabled)" }} />
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                style={{
                  backgroundColor: a.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: a.status === "active" ? "var(--pr-trust-green)" : "var(--pr-critical-red)",
                }}
              >
                {formatStatus(a.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
