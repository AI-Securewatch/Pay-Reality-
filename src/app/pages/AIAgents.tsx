import { useState } from "react";
import {
  Bot, Plus, X, ChevronRight, CheckCircle2, Shield, Zap, Activity,
  AlertTriangle, BarChart3, Search, Filter, ArrowRight, Circle,
  Lock, Eye, Lightbulb, Play, UserCheck, Star,
} from "lucide-react";
import { motion } from "motion/react";

const agents = [
  { name: "Finance Agent", status: "Active", decisions: "2,847", accuracy: "99.2%", risk: "High", framework: "LangGraph", department: "Finance", lastActivity: "Just now" },
  { name: "Procurement Agent", status: "Active", decisions: "1,923", accuracy: "98.8%", risk: "Medium", framework: "OpenAI Agents", department: "Procurement", lastActivity: "3 min ago" },
  { name: "Payroll Agent", status: "Active", decisions: "987", accuracy: "99.9%", risk: "High", framework: "Claude", department: "HR", lastActivity: "12 min ago" },
  { name: "Customer Support Agent", status: "Active", decisions: "5,234", accuracy: "97.5%", risk: "Low", framework: "CrewAI", department: "Support", lastActivity: "1 min ago" },
  { name: "Treasury Agent", status: "Active", decisions: "432", accuracy: "99.7%", risk: "Critical", framework: "Custom", department: "Treasury", lastActivity: "Just now" },
  { name: "Vendor Approval Agent", status: "Active", decisions: "218", accuracy: "98.1%", risk: "Medium", framework: "LangGraph", department: "Procurement", lastActivity: "8 min ago" },
];

const riskColors: Record<string, string> = {
  Critical: "var(--pr-critical-red)",
  High: "var(--pr-warning-amber)",
  Medium: "var(--pr-evidence-cyan)",
  Low: "var(--pr-trust-green)",
};

const authorityTiers = [
  { tier: 1, label: "Read Only", desc: "View and monitor data without taking action", icon: Eye, color: "var(--pr-text-muted)" },
  { tier: 2, label: "Recommend Only", desc: "Surface insights and suggestions for human review", icon: Lightbulb, color: "var(--pr-evidence-cyan)" },
  { tier: 3, label: "Execute Low Risk", desc: "Autonomously execute pre-approved low-risk actions", icon: Play, color: "var(--pr-trust-green)" },
  { tier: 4, label: "Execute with Approval", desc: "Execute actions requiring human sign-off above thresholds", icon: UserCheck, color: "var(--pr-authority-blue)" },
  { tier: 5, label: "Autonomous Authority", desc: "Full delegated authority within defined scope and limits", icon: Star, color: "var(--pr-warning-amber)" },
];

const authorityDomains = [
  "Payments", "Procurement", "Contracts", "Payroll",
  "Pricing", "CRM", "Customer Support", "Operations",
  "Vendor Management", "Financial Reporting",
];

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type AgentForm = {
  name: string;
  department: string;
  owner: string;
  businessFunction: string;
  environment: string;
  framework: string;
  authorityTier: number;
  domains: string[];
  transactionLimit: string;
  dailyLimit: string;
  monthlyLimit: string;
  approvalThreshold: string;
  escalationThreshold: string;
};

const defaultForm: AgentForm = {
  name: "",
  department: "Finance",
  owner: "",
  businessFunction: "",
  environment: "Production",
  framework: "OpenAI Agents",
  authorityTier: 3,
  domains: [],
  transactionLimit: "",
  dailyLimit: "",
  monthlyLimit: "",
  approvalThreshold: "",
  escalationThreshold: "",
};

export function AIAgents() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<AgentForm>(defaultForm);
  const [selectedAgent, setSelectedAgent] = useState<(typeof agents)[0] | null>(null);
  const [agentList, setAgentList] = useState(agents);
  const [search, setSearch] = useState("");

  const openWizard = () => {
    setForm(defaultForm);
    setStep(1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setStep(1);
  };

  const handleDelegate = () => {
    if (!form.name) return;
    setAgentList((prev) => [
      {
        name: form.name,
        status: "Active",
        decisions: "0",
        accuracy: "—",
        risk: form.authorityTier >= 5 ? "Critical" : form.authorityTier >= 4 ? "High" : form.authorityTier >= 3 ? "Medium" : "Low",
        framework: form.framework,
        department: form.department,
        lastActivity: "Just now",
      },
      ...prev,
    ]);
    closeWizard();
  };

  const filteredAgents = agentList.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.department.toLowerCase().includes(search.toLowerCase())
  );

  const stepLabels: Record<WizardStep, string> = {
    1: "Identity",
    2: "Authority Assignment",
    3: "Authority Scope",
    4: "Authority Limits",
    5: "Approval Matrix",
    6: "Summary",
  };

  return (
    <div style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
                AI Agents
              </span>
            </div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
              Delegated Authority Registry
            </h1>
            <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
              Monitor and manage all AI agents operating under delegated authority
            </p>
          </div>
          <button
            onClick={openWizard}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#5D8CFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--pr-authority-blue)"; }}
          >
            <Plus className="w-4 h-4" />
            Delegate Authority
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8">
          {[
            { label: "Active Agents", value: agentList.filter((a) => a.status === "Active").length, color: "var(--pr-trust-green)" },
            { label: "Decisions Today", value: "11,641", color: "var(--pr-authority-blue)" },
            { label: "Avg Accuracy", value: "99.0%", color: "var(--pr-evidence-cyan)" },
            { label: "Critical Risk", value: agentList.filter((a) => a.risk === "Critical").length, color: "var(--pr-critical-red)" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="p-8">
        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--pr-text-muted)" }} />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)", color: "var(--pr-text-primary)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
          </div>
          <button
            className="px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2"
            style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)", color: "var(--pr-text-secondary)" }}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              className="p-5 rounded-xl border cursor-pointer transition-all duration-150 group"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}
              onClick={() => setSelectedAgent(agent)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(77,124,254,0.3)";
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.backgroundColor = "var(--pr-bg-card)";
              }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(77,124,254,0.1)" }}
                  >
                    <Bot className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--pr-text-primary)" }}>{agent.name}</p>
                    <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{agent.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--pr-trust-green)" }} />
                  <span className="text-xs" style={{ color: "var(--pr-trust-green)" }}>{agent.status}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Decisions Today</span>
                  <span className="text-xs font-mono font-medium" style={{ color: "var(--pr-text-primary)" }}>{agent.decisions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Accuracy Rate</span>
                  <span className="text-xs font-mono font-medium" style={{ color: "var(--pr-trust-green)" }}>{agent.accuracy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Framework</span>
                  <span className="text-xs font-mono" style={{ color: "var(--pr-text-secondary)" }}>{agent.framework}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${riskColors[agent.risk] ?? "var(--pr-text-muted)"}15`,
                    color: riskColors[agent.risk] ?? "var(--pr-text-muted)",
                  }}
                >
                  {agent.risk} Risk
                </span>
                <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{agent.lastActivity}</span>
              </div>
            </motion.div>
          ))}

          {/* Add Agent Card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: filteredAgents.length * 0.04 }}
            onClick={openWizard}
            className="p-5 rounded-xl border-2 border-dashed transition-all duration-150 flex flex-col items-center justify-center gap-3 min-h-[200px]"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--pr-authority-blue)";
              e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(77,124,254,0.1)" }}>
              <Plus className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-0.5" style={{ color: "var(--pr-text-secondary)" }}>Delegate Authority</p>
              <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Add a new AI agent</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedAgent(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "var(--pr-bg-secondary)", borderColor: "rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(77,124,254,0.1)" }}>
                  <Bot className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--pr-text-primary)" }}>{selectedAgent.name}</h3>
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{selectedAgent.department} · {selectedAgent.framework}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-2 rounded-lg" style={{ color: "var(--pr-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Decisions Today", value: selectedAgent.decisions, color: "var(--pr-authority-blue)" },
                  { label: "Accuracy Rate", value: selectedAgent.accuracy, color: "var(--pr-trust-green)" },
                  { label: "Risk Level", value: selectedAgent.risk, color: riskColors[selectedAgent.risk] },
                  { label: "Status", value: selectedAgent.status, color: "var(--pr-trust-green)" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--pr-bg-card)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>{s.label}</p>
                    <p className="text-lg font-semibold font-mono" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {[
                { label: "Authority Level", value: "Tier 4 — Execute with Approval" },
                { label: "Assigned Policies", value: "Enterprise Financial Policy v3.2, SOC 2 Controls" },
                { label: "Insurance Eligibility", value: "Eligible — All requirements met" },
                { label: "Last Activity", value: selectedAgent.lastActivity },
              ].map((r) => (
                <div key={r.label} className="flex items-start justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{r.label}</span>
                  <span className="text-sm font-medium text-right max-w-xs" style={{ color: "var(--pr-text-primary)" }}>{r.value}</span>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-secondary)" }}
                >
                  Close
                </button>
                <button
                  onClick={() => { setSelectedAgent(null); openWizard(); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
                >
                  Edit Authority
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delegate Authority Wizard */}
      {wizardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col"
            style={{
              backgroundColor: "var(--pr-bg-secondary)",
              borderColor: "rgba(255,255,255,0.1)",
              maxHeight: "90vh",
            }}
          >
            {/* Wizard Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                  Step {step} of 6 — {stepLabels[step]}
                </p>
                <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                  Delegate Authority To An AI Agent
                </h2>
              </div>
              <button onClick={closeWizard} className="p-2 rounded-lg" style={{ color: "var(--pr-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress */}
            <div className="flex px-6 pt-4 pb-0 gap-1">
              {([1, 2, 3, 4, 5, 6] as WizardStep[]).map((s) => (
                <div
                  key={s}
                  className="flex-1 h-1 rounded-full transition-all"
                  style={{
                    backgroundColor: s <= step ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>

            {/* Wizard Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Identity */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <p className="text-sm mb-6" style={{ color: "var(--pr-text-muted)" }}>
                    Define the identity of the AI agent you are delegating authority to.
                  </p>
                  {[
                    { key: "name", label: "Agent Name", placeholder: "e.g. Finance Agent" },
                    { key: "owner", label: "Owner", placeholder: "e.g. Sarah Chen" },
                    { key: "businessFunction", label: "Business Function", placeholder: "e.g. Accounts Payable Automation" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>{f.label}</label>
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={form[f.key as keyof AgentForm] as string}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "department", label: "Department", options: ["Finance", "Procurement", "HR", "Treasury", "Legal", "Operations", "Support"] },
                      { key: "environment", label: "Environment", options: ["Production", "Staging", "Testing"] },
                      { key: "framework", label: "AI Framework", options: ["OpenAI Agents", "LangGraph", "CrewAI", "Microsoft Copilot", "Claude", "Custom"] },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>{f.label}</label>
                        <select
                          value={form[f.key as keyof AgentForm] as string}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}
                        >
                          {f.options.map((o) => <option key={o} value={o} style={{ backgroundColor: "var(--pr-bg-secondary)" }}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Authority Assignment */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                  <p className="text-sm mb-6" style={{ color: "var(--pr-text-muted)" }}>
                    Select the authority tier that defines what this agent is permitted to do.
                  </p>
                  {authorityTiers.map((tier) => {
                    const Icon = tier.icon;
                    const isSelected = form.authorityTier === tier.tier;
                    return (
                      <button
                        key={tier.tier}
                        onClick={() => setForm({ ...form, authorityTier: tier.tier })}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all"
                        style={{
                          backgroundColor: isSelected ? `${tier.color}10` : "var(--pr-bg-card)",
                          borderColor: isSelected ? tier.color : "rgba(255,255,255,0.07)",
                        }}
                      >
                        {/* Trust bar */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="w-1.5 h-5 rounded-sm transition-all"
                              style={{
                                backgroundColor: i <= tier.tier
                                  ? tier.color
                                  : "rgba(255,255,255,0.08)",
                              }}
                            />
                          ))}
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tier.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: tier.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-0.5" style={{ color: isSelected ? tier.color : "var(--pr-text-primary)" }}>
                            Tier {tier.tier} — {tier.label}
                          </p>
                          <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{tier.desc}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: tier.color }} />}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* Step 3: Authority Scope */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                  <p className="text-sm mb-6" style={{ color: "var(--pr-text-muted)" }}>
                    Select the authority domains this agent is permitted to operate within.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {authorityDomains.map((domain) => {
                      const selected = form.domains.includes(domain);
                      return (
                        <button
                          key={domain}
                          onClick={() =>
                            setForm({
                              ...form,
                              domains: selected
                                ? form.domains.filter((d) => d !== domain)
                                : [...form.domains, domain],
                            })
                          }
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                          style={{
                            backgroundColor: selected ? "rgba(77,124,254,0.08)" : "var(--pr-bg-card)",
                            borderColor: selected ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.07)",
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              borderColor: selected ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.2)",
                              backgroundColor: selected ? "var(--pr-authority-blue)" : "transparent",
                            }}
                          >
                            {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm" style={{ color: selected ? "var(--pr-text-primary)" : "var(--pr-text-secondary)" }}>
                            {domain}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.domains.length > 0 && (
                    <p className="text-xs mt-4 text-center" style={{ color: "var(--pr-authority-blue)" }}>
                      {form.domains.length} domain{form.domains.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </motion.div>
              )}

              {/* Step 4: Authority Limits */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <p className="text-sm mb-6" style={{ color: "var(--pr-text-muted)" }}>
                    Define the financial and operational limits for this agent's authority.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "transactionLimit", label: "Transaction Limit", placeholder: "e.g. $50,000" },
                      { key: "dailyLimit", label: "Daily Limit", placeholder: "e.g. $200,000" },
                      { key: "monthlyLimit", label: "Monthly Limit", placeholder: "e.g. $1,000,000" },
                      { key: "approvalThreshold", label: "Approval Threshold", placeholder: "e.g. $25,000" },
                      { key: "escalationThreshold", label: "Escalation Threshold", placeholder: "e.g. $100,000" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>{f.label}</label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={form[f.key as keyof AgentForm] as string}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none font-mono transition-all"
                          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
                    <p className="text-xs" style={{ color: "var(--pr-warning-amber)" }}>
                      Authority limits are enforced in real-time. Actions exceeding these limits will be automatically blocked and escalated.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Approval Matrix */}
              {step === 5 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <p className="text-sm mb-6" style={{ color: "var(--pr-text-muted)" }}>
                    Define who must approve this agent's actions at each threshold.
                  </p>
                  {[
                    { label: "Tier 1 Approver", desc: "For actions up to approval threshold", placeholder: "e.g. Finance Manager" },
                    { label: "Tier 2 Approver", desc: "For actions up to escalation threshold", placeholder: "e.g. Finance Director" },
                    { label: "Executive Approver", desc: "For actions above escalation threshold", placeholder: "e.g. CFO" },
                    { label: "Fallback Approver", desc: "When primary approvers are unavailable", placeholder: "e.g. Deputy CFO" },
                    { label: "Emergency Approver", desc: "For emergency overrides", placeholder: "e.g. CEO" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-0.5" style={{ color: "var(--pr-text-primary)" }}>{row.label}</p>
                        <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{row.desc}</p>
                      </div>
                      <input
                        type="text"
                        placeholder={row.placeholder}
                        className="px-3 py-2 rounded-lg border text-sm outline-none w-48 transition-all"
                        style={{ backgroundColor: "var(--pr-bg-secondary)", borderColor: "rgba(255,255,255,0.07)", color: "var(--pr-text-primary)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                      />
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Step 6: Summary */}
              {step === 6 && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="p-4 rounded-xl border mb-6" style={{ backgroundColor: "rgba(77,124,254,0.06)", borderColor: "rgba(77,124,254,0.2)" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                      <p className="text-sm font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                        {form.name || "Unnamed Agent"} — Authority Profile
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                      Review the authority profile before delegation.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Agent Name", value: form.name || "—" },
                      { label: "Department", value: form.department },
                      { label: "Framework", value: form.framework },
                      { label: "Environment", value: form.environment },
                      { label: "Authority Tier", value: `Tier ${form.authorityTier} — ${authorityTiers[form.authorityTier - 1].label}` },
                      { label: "Authority Domains", value: form.domains.length > 0 ? form.domains.join(", ") : "None selected" },
                      { label: "Transaction Limit", value: form.transactionLimit || "—" },
                      { label: "Daily Limit", value: form.dailyLimit || "—" },
                    ].map((r) => (
                      <div key={r.label} className="flex items-start justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <span className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{r.label}</span>
                        <span className="text-sm font-medium text-right max-w-xs" style={{ color: "var(--pr-text-primary)" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: "Authority Score", value: "8.4", color: "var(--pr-authority-blue)" },
                      { label: "Trust Score", value: "9.1", color: "var(--pr-trust-green)" },
                      { label: "Insurance Ready", value: "Yes", color: "var(--pr-evidence-cyan)" },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: "var(--pr-bg-card)" }}>
                        <p className="text-xl font-semibold font-mono" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--pr-text-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => step > 1 ? setStep((s) => (s - 1) as WizardStep) : closeWizard()}
                className="px-4 py-2.5 rounded-lg text-sm border transition-all"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-secondary)" }}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <div className="flex items-center gap-2">
                {([1, 2, 3, 4, 5, 6] as WizardStep[]).map((s) => (
                  <div
                    key={s}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ backgroundColor: s === step ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.15)" }}
                  />
                ))}
              </div>
              <button
                onClick={() => step < 6 ? setStep((s) => (s + 1) as WizardStep) : handleDelegate()}
                disabled={step === 1 && !form.name}
                className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: step === 1 && !form.name ? "rgba(77,124,254,0.3)" : "var(--pr-authority-blue)",
                  color: "#fff",
                  cursor: step === 1 && !form.name ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!(step === 1 && !form.name)) e.currentTarget.style.backgroundColor = "#5D8CFF";
                }}
                onMouseLeave={(e) => {
                  if (!(step === 1 && !form.name)) e.currentTarget.style.backgroundColor = "var(--pr-authority-blue)";
                }}
              >
                {step === 6 ? "Delegate Authority" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
