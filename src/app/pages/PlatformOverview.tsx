import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Shield,
  FileText,
  FlaskConical,
  Database,
  Building2,
  ArrowRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "../live/apiClient";
import type { LiveAgent, LivePolicy } from "../live/types";

const WORKFLOW = [
  {
    step: "01",
    icon: Shield,
    title: "Agents",
    desc: "Register the AI agents operating in your enterprise and the identity each one acts under.",
    path: "/agents",
    color: "var(--pr-authority-blue)",
  },
  {
    step: "02",
    icon: FileText,
    title: "Governance",
    desc: "Upload your existing governance documents and let AI find the rules for you, or write one by hand.",
    path: "/governance",
    color: "var(--pr-evidence-cyan)",
  },
  {
    step: "03",
    icon: FlaskConical,
    title: "Decisions",
    desc: "See what happens when an agent tries to act: approved, blocked, or sent to a human, evaluated against your rules in real time.",
    path: "/decisions",
    color: "var(--pr-warning-amber)",
  },
  {
    step: "04",
    icon: Database,
    title: "Evidence",
    desc: "Every decision produces a cryptographically signed record. Verify any record's signature independently, right here.",
    path: "/evidence",
    color: "var(--pr-verification-purple)",
  },
  {
    step: "05",
    icon: Building2,
    title: "Assurance",
    desc: "A live rollup of what's actually been authorized, decided, and evidenced. Not a projection, a record.",
    path: "/assurance",
    color: "var(--pr-trust-green)",
  },
];

export function PlatformOverview() {
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [activePolicy, setActivePolicy] = useState<LivePolicy | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ agents: LiveAgent[]; total: number }>("/v1/agents"),
      apiClient.get<LivePolicy[]>("/v1/policies"),
    ])
      .then(([agentPage, policies]) => {
        setAgentCount(agentPage.total);
        setActivePolicy(policies.find((p) => p.status === "active") ?? null);
        setReachable(true);
      })
      .catch(() => setReachable(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="mb-14 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" style={{ color: "var(--pr-authority-blue)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
            Runtime Trust Platform
          </span>
        </div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--pr-text-primary)" }}>
          Is this AI authorised to execute this action?
        </h1>
        <p className="text-lg max-w-2xl mb-2" style={{ color: "var(--pr-text-secondary)" }}>
          PayReality is Enterprise Trust Infrastructure for autonomous AI. Every enterprise already
          knows how to delegate authority to people. This platform makes that authority
          machine-enforceable: every AI action is evaluated against your actual policy,
          deterministically, before it executes, and every decision produces evidence you can
          verify independently.
        </p>
        <p className="text-sm max-w-2xl mb-8" style={{ color: "var(--pr-text-muted)" }}>
          Not a model's judgment call. A rule, evaluated the same way every time, fail-closed by
          default: if the engine can't confirm an action is authorized, it never defaults to
          allow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/governance/authority-builder"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
          >
            Show me what your agents are allowed to do
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/decisions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: "var(--pr-overlay-12)", color: "var(--pr-text-primary)" }}
          >
            Test a decision now
          </Link>
        </div>
      </div>

      {/* Live status strip */}
      <div
        className="mb-14 p-5 rounded-xl border flex flex-wrap items-center gap-6"
        style={{ borderColor: "var(--pr-overlay-06)", backgroundColor: "var(--pr-bg-card)" }}
      >
        {reachable === false ? (
          <div role="alert" className="flex items-center gap-2 text-sm" style={{ color: "var(--pr-warning-amber)" }}>
            <ShieldCheck className="w-4 h-4" />
            We couldn't reach the service. Please check your connection and try again.
          </div>
        ) : (
          <>
            <div>
              <div className="text-2xl font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                {agentCount ?? "N/A"}
              </div>
              <div className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                Registered agents
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                {activePolicy ? `v${activePolicy.version}` : "None"}
              </div>
              <div className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                Active rule
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto text-xs" style={{ color: "var(--pr-text-muted)" }}>
              <Lock className="w-3.5 h-3.5" />
              ED25519-signed evidence, verifiable independently of this app
            </div>
          </>
        )}
      </div>

      {/* The workflow */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
          One workflow, not a dashboard
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--pr-text-muted)" }}>
          Agents → Governance → Decisions → Evidence → Assurance. Every stage feeds the next.
        </p>
      </div>
      <div className="grid gap-4">
        {WORKFLOW.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.path}
              className="flex items-start gap-5 p-6 rounded-xl border transition-colors group"
              style={{ borderColor: "var(--pr-overlay-06)", backgroundColor: "var(--pr-bg-card)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${item.color}1A`, border: `1px solid ${item.color}40` }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: "var(--pr-text-muted)" }}>
                    {item.step}
                  </span>
                  <h3 className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{item.desc}</p>
              </div>
              <ArrowRight
                className="w-4 h-4 flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: item.color }}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
