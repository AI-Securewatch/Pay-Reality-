import { useEffect, useState } from "react";
import { Building2, Bot, ShieldCheck, ShieldAlert, ShieldX, FileCheck } from "lucide-react";
import { apiClient } from "../apiClient";
import type { LivePolicy, LiveEvidence } from "../types";

interface EvidencePayload {
  authority_outcome?: "ALLOW" | "DENY" | "HUMAN_REVIEW";
  risk_classification?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export function LiveAssurance() {
  const [agentTotal, setAgentTotal] = useState(0);
  const [activeAgentTotal, setActiveAgentTotal] = useState(0);
  const [policies, setPolicies] = useState<LivePolicy[]>([]);
  const [evidence, setEvidence] = useState<LiveEvidence[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Two separate totals, not a client-side filter over one page: at
    // Phase 9 scale (AGENT_DIRECTORY.md, "10,000+ agents") a single page
    // of /v1/agents no longer represents every agent, so this rollup
    // reads each count directly from the paginated envelope's `total`.
    Promise.all([
      apiClient.get<{ total: number }>("/v1/agents?limit=1"),
      apiClient.get<{ total: number }>("/v1/agents?status=active&limit=1"),
      apiClient.get<LivePolicy[]>("/v1/policies"),
      apiClient.get<LiveEvidence[]>("/v1/evidence"),
    ])
      .then(([agentPage, activeAgentPage, p, e]) => {
        setAgentTotal(agentPage.total);
        setActiveAgentTotal(activeAgentPage.total);
        setPolicies(p);
        setEvidence(e);
      })
      .catch(() => setError("We couldn't reach the service. Check your connection and try again."));
  }, []);

  const activePolicy = policies.find((p) => p.status === "active");
  const activeAgents = activeAgentTotal;

  const outcomeCounts = evidence.reduce(
    (acc, e) => {
      const outcome = (e.payload as EvidencePayload)?.authority_outcome;
      if (outcome) acc[outcome] = (acc[outcome] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const verifiedCount = evidence.filter((e) => e.status === "VERIFIED").length;

  const cards = [
    { icon: Bot, label: "Active agents", value: activeAgents, total: agentTotal, color: "var(--pr-authority-blue)" },
    {
      icon: FileCheck,
      label: "Active policy",
      value: activePolicy ? `v${activePolicy.version}` : "None",
      color: activePolicy ? "var(--pr-trust-green)" : "var(--pr-warning-amber)",
    },
    { icon: ShieldCheck, label: "Allowed", value: outcomeCounts.ALLOW ?? 0, color: "var(--pr-trust-green)" },
    { icon: ShieldAlert, label: "Escalated to review", value: outcomeCounts.HUMAN_REVIEW ?? 0, color: "var(--pr-warning-amber)" },
    { icon: ShieldX, label: "Denied", value: outcomeCounts.DENY ?? 0, color: "var(--pr-critical-red)" },
  ];

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5" style={{ color: "var(--pr-trust-green)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-trust-green)" }}>
            Assurance
          </span>
        </div>
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Enterprise Assurance</h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          A live rollup of what has actually been authorized, decided, and evidenced. Every number
          here is pulled directly from your agents, policies, and signed Evidence records.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm mb-6" style={{ color: "var(--pr-warning-amber)" }}>
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="p-5 rounded-xl border"
              style={{ borderColor: "var(--pr-overlay-06)", backgroundColor: "var(--pr-bg-card)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${c.color}1A` }}
              >
                <Icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <div className="text-2xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
                {c.value}
                {c.total !== undefined && (
                  <span className="text-sm font-normal" style={{ color: "var(--pr-text-muted)" }}>
                    {" "}
                    / {c.total}
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{c.label}</div>
            </div>
          );
        })}
      </div>

      <div
        className="p-5 rounded-xl border flex items-center gap-3"
        style={{ borderColor: "var(--pr-overlay-06)", backgroundColor: "var(--pr-bg-card)" }}
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--pr-verification-purple)" }} />
        <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
          <strong style={{ color: "var(--pr-text-primary)" }}>{verifiedCount}</strong> of{" "}
          <strong style={{ color: "var(--pr-text-primary)" }}>{evidence.length}</strong> evidence
          records currently carry cryptographic verified status. Verify any individual record on
          the Evidence page.
        </p>
      </div>
    </div>
  );
}
