import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Activity, Bot, FileCheck, FlaskConical, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { apiClient } from "../apiClient";
import type { LiveAgent, LivePolicy } from "../types";

export function LiveOverview() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [policies, setPolicies] = useState<LivePolicy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<LiveAgent[]>("/v1/agents"),
      apiClient.get<LivePolicy[]>("/v1/policies"),
    ])
      .then(([a, p]) => {
        setAgents(a);
        setPolicies(p);
      })
      .catch(() => setError("Could not reach the Live backend. Is the server running on :8000?"));
  }, []);

  const activePolicy = policies.find((p) => p.status === "active");

  const cards = [
    { icon: Bot, label: "Registered Agents", value: agents.length, color: "var(--pr-authority-blue)" },
    {
      icon: ShieldCheck,
      label: "Active Policy Version",
      value: activePolicy ? `v${activePolicy.version}` : "None",
      color: activePolicy ? "var(--pr-trust-green)" : "var(--pr-warning-amber)",
    },
    { icon: FileCheck, label: "Total Policy Versions", value: policies.length, color: "var(--pr-evidence-cyan)" },
  ];

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
            Live
          </span>
        </div>
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          PayReality Live
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          The real decision engine and policy pipeline, running against your local OPA + Postgres.
          Independent of the Demo pages above.
        </p>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl border mb-8"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          <p className="text-sm" style={{ color: "var(--pr-critical-red)" }}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl border"
            style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
          >
            <c.icon className="w-5 h-5 mb-3" style={{ color: c.color }} />
            <p className="text-2xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
              {c.value}
            </p>
            <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: "/live/documents", icon: FileCheck, label: "Documents & Review", desc: "Upload a DoA PDF, review extracted authority, compile & activate policy." },
          { to: "/live/agents", icon: Bot, label: "Agents", desc: "Register AI agents with a signing key." },
          { to: "/live/test-intent", icon: FlaskConical, label: "Test a Decision", desc: "Submit a signed intent and watch it evaluate." },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="p-5 rounded-2xl border transition-all block"
            style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(77,124,254,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
          >
            <link.icon className="w-5 h-5 mb-3" style={{ color: "var(--pr-authority-blue)" }} />
            <p className="font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>{link.label}</p>
            <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
