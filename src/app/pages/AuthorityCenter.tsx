import { useState } from "react";
import { Search, Filter, MoreVertical, Shield, AlertCircle, Plus, X, ChevronRight, CheckCircle2, Eye, Lightbulb, Play, UserCheck, Star } from "lucide-react";
import { motion } from "motion/react";

const agents = [
  { 
    name: "Finance Agent", 
    tier: "Critical", 
    permissions: "Full Treasury", 
    spendLimit: "$500,000", 
    risk: "High", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "2 min ago" 
  },
  { 
    name: "Procurement Agent", 
    tier: "High", 
    permissions: "Purchase Orders", 
    spendLimit: "$250,000", 
    risk: "Medium", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "5 min ago" 
  },
  { 
    name: "Payroll Agent", 
    tier: "Critical", 
    permissions: "Disbursements", 
    spendLimit: "$1,000,000", 
    risk: "High", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "12 min ago" 
  },
  { 
    name: "Customer Support Agent", 
    tier: "Standard", 
    permissions: "Refunds", 
    spendLimit: "$10,000", 
    risk: "Low", 
    status: "Active", 
    coverage: "98%", 
    lastActivity: "1 min ago" 
  },
  { 
    name: "Legal Research Agent", 
    tier: "Standard", 
    permissions: "Read-Only", 
    spendLimit: "$0", 
    risk: "Low", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "30 min ago" 
  },
  { 
    name: "Vendor Approval Agent", 
    tier: "High", 
    permissions: "Vendor Management", 
    spendLimit: "$100,000", 
    risk: "Medium", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "8 min ago" 
  },
  { 
    name: "Treasury Agent", 
    tier: "Critical", 
    permissions: "Cross-Border", 
    spendLimit: "$2,000,000", 
    risk: "Critical", 
    status: "Active", 
    coverage: "100%", 
    lastActivity: "Just now" 
  },
];

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'critical': return 'var(--pr-critical-red)';
    case 'high': return 'var(--pr-warning-amber)';
    case 'medium': return 'var(--pr-evidence-cyan)';
    case 'low': return 'var(--pr-trust-green)';
    default: return 'var(--pr-text-muted)';
  }
};

const getTierColor = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'critical': return 'var(--pr-critical-red)';
    case 'high': return 'var(--pr-authority-blue)';
    case 'standard': return 'var(--pr-text-muted)';
    default: return 'var(--pr-text-muted)';
  }
};

const authorityTiers = [
  { tier: 1, label: "Read Only", desc: "View and monitor data without taking action", icon: Eye, color: "var(--pr-text-muted)" },
  { tier: 2, label: "Recommend Only", desc: "Surface insights and suggestions for human review", icon: Lightbulb, color: "var(--pr-evidence-cyan)" },
  { tier: 3, label: "Execute Low Risk", desc: "Autonomously execute pre-approved low-risk actions", icon: Play, color: "var(--pr-trust-green)" },
  { tier: 4, label: "Execute with Approval", desc: "Execute actions requiring human sign-off above thresholds", icon: UserCheck, color: "var(--pr-authority-blue)" },
  { tier: 5, label: "Autonomous Authority", desc: "Full delegated authority within defined scope and limits", icon: Star, color: "var(--pr-warning-amber)" },
];

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export function AuthorityCenter() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [agentName, setAgentName] = useState("");
  const [agentDept, setAgentDept] = useState("Finance");
  const [agentFramework, setAgentFramework] = useState("OpenAI Agents");
  const [authorityTier, setAuthorityTier] = useState(3);

  const stepLabels: Record<WizardStep, string> = {
    1: "Identity", 2: "Authority Assignment", 3: "Authority Scope",
    4: "Authority Limits", 5: "Approval Matrix", 6: "Summary",
  };

  const [activeTab, setActiveTab] = useState("Agents");

  const openWizard = () => { setWizardStep(1); setAgentName(""); setWizardOpen(true); };
  const closeWizard = () => { setWizardOpen(false); };

  return (
    <div style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 style={{ color: 'var(--pr-text-primary)' }}>Authority Center</h1>
            <p style={{ color: 'var(--pr-text-muted)' }}>Manage AI authority delegation and permissions</p>
          </div>
          <button
            onClick={openWizard}
            className="px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 text-sm font-medium"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#5D8CFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--pr-authority-blue)"; }}
          >
            <Plus className="w-4 h-4" />
            Delegate Authority
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 mt-4">
          {["Agents", "Authority Models"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150"
              style={{
                borderBottomColor: activeTab === tab ? 'var(--pr-authority-blue)' : 'transparent',
                color: activeTab === tab ? 'var(--pr-text-primary)' : 'var(--pr-text-muted)',
                backgroundColor: 'transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Authority Models" && <AuthorityModelsTab />}

      {activeTab === "Agents" && <div className="p-8">
      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--pr-text-muted)' }} />
          <input
            type="text"
            placeholder="Search agents..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)',
              color: 'var(--pr-text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--pr-authority-blue)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}
          />
        </div>
        <button
          onClick={() => alert('Filter')}
          className="px-4 py-3 rounded-xl border flex items-center gap-2 transition-all"
          style={{ 
            backgroundColor: 'var(--pr-bg-card)', 
            borderColor: 'rgba(255,255,255,0.05)',
            color: 'var(--pr-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--pr-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--pr-bg-card)';
          }}
        >
          <Filter className="w-5 h-5" />
          <span>Filter</span>
        </button>
      </div>

      {/* Agents Table */}
      <div 
        className="rounded-3xl border overflow-hidden"
        style={{ 
          backgroundColor: 'var(--pr-bg-card)', 
          borderColor: 'rgba(255,255,255,0.05)' 
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Agent Name</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Authority Tier</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Permissions</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Spend Limit</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Risk Rating</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Evidence Coverage</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--pr-text-muted)' }}>Last Activity</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <motion.tr
                  key={agent.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="cursor-pointer transition-all"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--pr-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setSelectedAgent(agent.name)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(77, 124, 254, 0.1)' }}>
                        <Shield className="w-5 h-5" style={{ color: 'var(--pr-authority-blue)' }} />
                      </div>
                      <span className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{agent.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getTierColor(agent.tier)}15`,
                        color: getTierColor(agent.tier),
                      }}
                    >
                      {agent.tier}
                    </span>
                  </td>
                  <td className="p-4" style={{ color: 'var(--pr-text-secondary)' }}>{agent.permissions}</td>
                  <td className="p-4">
                    <span className="font-mono" style={{ color: 'var(--pr-text-primary)' }}>{agent.spendLimit}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" style={{ color: getRiskColor(agent.risk) }} />
                      <span style={{ color: getRiskColor(agent.risk) }}>{agent.risk}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--pr-trust-green)' }}></div>
                      <span style={{ color: 'var(--pr-trust-green)' }}>{agent.status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pr-bg-hover)', width: '60px' }}>
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: agent.coverage, 
                            backgroundColor: 'var(--pr-trust-green)' 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--pr-text-primary)' }}>{agent.coverage}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm" style={{ color: 'var(--pr-text-muted)' }}>{agent.lastActivity}</td>
                  <td className="p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`More options for ${agent.name}`);
                      }}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--pr-text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--pr-bg-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>}

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
            style={{ backgroundColor: "var(--pr-bg-secondary)", borderColor: "rgba(255,255,255,0.1)", maxHeight: "85vh" }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                  Step {wizardStep} of 6 — {stepLabels[wizardStep]}
                </p>
                <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                  Delegate Authority To An AI Agent
                </h2>
              </div>
              <button onClick={closeWizard} className="p-2 rounded-lg" style={{ color: "var(--pr-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex px-6 pt-4 pb-0 gap-1">
              {([1, 2, 3, 4, 5, 6] as WizardStep[]).map((s) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all"
                  style={{ backgroundColor: s <= wizardStep ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm mb-4" style={{ color: "var(--pr-text-muted)" }}>
                    Define the identity of the AI agent you are delegating authority to.
                  </p>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Agent Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Finance Agent"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                      style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Department</label>
                      <select value={agentDept} onChange={(e) => setAgentDept(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}>
                        {["Finance", "Procurement", "HR", "Treasury", "Legal", "Operations"].map((d) => (
                          <option key={d} value={d} style={{ backgroundColor: "var(--pr-bg-secondary)" }}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>AI Framework</label>
                      <select value={agentFramework} onChange={(e) => setAgentFramework(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-primary)" }}>
                        {["OpenAI Agents", "LangGraph", "CrewAI", "Microsoft Copilot", "Claude", "Custom"].map((f) => (
                          <option key={f} value={f} style={{ backgroundColor: "var(--pr-bg-secondary)" }}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm mb-4" style={{ color: "var(--pr-text-muted)" }}>Select the authority tier for this agent.</p>
                  {authorityTiers.map((tier) => {
                    const Icon = tier.icon;
                    const isSelected = authorityTier === tier.tier;
                    return (
                      <button key={tier.tier} onClick={() => setAuthorityTier(tier.tier)}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all"
                        style={{ backgroundColor: isSelected ? `${tier.color}10` : "var(--pr-bg-card)", borderColor: isSelected ? tier.color : "rgba(255,255,255,0.07)" }}>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((i) => (
                            <div key={i} className="w-1.5 h-5 rounded-sm"
                              style={{ backgroundColor: i <= tier.tier ? tier.color : "rgba(255,255,255,0.08)" }} />
                          ))}
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tier.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: tier.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: isSelected ? tier.color : "var(--pr-text-primary)" }}>
                            Tier {tier.tier} — {tier.label}
                          </p>
                          <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{tier.desc}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5" style={{ color: tier.color }} />}
                      </button>
                    );
                  })}
                </div>
              )}
              {wizardStep >= 3 && wizardStep < 6 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm mb-2" style={{ color: "var(--pr-text-primary)" }}>{stepLabels[wizardStep]}</p>
                  <p className="text-xs text-center max-w-xs" style={{ color: "var(--pr-text-muted)" }}>
                    Configure {stepLabels[wizardStep].toLowerCase()} for {agentName || "this agent"}.
                  </p>
                </div>
              )}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: "rgba(77,124,254,0.06)", borderColor: "rgba(77,124,254,0.2)" }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>{agentName || "Unnamed Agent"} — Authority Profile</p>
                    <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>Review before delegating authority.</p>
                  </div>
                  {[
                    { label: "Agent Name", value: agentName || "—" },
                    { label: "Department", value: agentDept },
                    { label: "Framework", value: agentFramework },
                    { label: "Authority Tier", value: `Tier ${authorityTier} — ${authorityTiers[authorityTier - 1].label}` },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <span className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => wizardStep > 1 ? setWizardStep((s) => (s - 1) as WizardStep) : closeWizard()}
                className="px-4 py-2.5 rounded-lg text-sm border"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-secondary)" }}
              >
                {wizardStep === 1 ? "Cancel" : "Back"}
              </button>
              <div className="flex items-center gap-2">
                {([1,2,3,4,5,6] as WizardStep[]).map((s) => (
                  <div key={s} className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: s === wizardStep ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.15)" }} />
                ))}
              </div>
              <button
                onClick={() => wizardStep < 6 ? setWizardStep((s) => (s + 1) as WizardStep) : closeWizard()}
                disabled={wizardStep === 1 && !agentName}
                className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: wizardStep === 1 && !agentName ? "rgba(77,124,254,0.3)" : "var(--pr-authority-blue)",
                  color: "#fff",
                }}
              >
                {wizardStep === 6 ? "Delegate Authority" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Agent Detail Panel (shows when an agent is selected) */}
      {selectedAgent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="max-w-2xl w-full p-8 rounded-3xl border"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6" style={{ color: 'var(--pr-text-primary)' }}>{selectedAgent} Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-2" style={{ color: 'var(--pr-text-muted)' }}>Authority Level</p>
                <p style={{ color: 'var(--pr-text-primary)' }}>Full Delegation - Requires Dual Approval</p>
              </div>
              <div>
                <p className="text-sm mb-2" style={{ color: 'var(--pr-text-muted)' }}>Assigned Policies</p>
                <p style={{ color: 'var(--pr-text-primary)' }}>Enterprise Financial Policy v3.2, SOC 2 Controls</p>
              </div>
              <div>
                <p className="text-sm mb-2" style={{ color: 'var(--pr-text-muted)' }}>Insurance Coverage Eligibility</p>
                <p style={{ color: 'var(--pr-trust-green)' }}>Eligible - All requirements met</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="mt-6 px-6 py-3 rounded-lg w-full transition-all"
              style={{ 
                backgroundColor: 'var(--pr-authority-blue)',
                color: 'var(--pr-text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5D8CFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--pr-authority-blue)';
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const hierarchyNodes = [
  { id: "ceo", label: "CEO", sub: "John Smith", level: 0, limit: "Unlimited", x: 360, y: 40 },
  { id: "cfo", label: "CFO", sub: "Sarah Chen", level: 1, limit: "$5,000,000", x: 200, y: 140 },
  { id: "cto", label: "CTO", sub: "Mark Davis", level: 1, limit: "$1,000,000", x: 520, y: 140 },
  { id: "fd", label: "Finance Director", sub: "Anna Lee", level: 2, limit: "$500,000", x: 100, y: 250 },
  { id: "pm", label: "Procurement Mgr", sub: "Tom Wilson", level: 2, limit: "$250,000", x: 300, y: 250 },
  { id: "fa", label: "Finance Agent", sub: "AI · LangGraph", level: 3, limit: "$50,000", x: 80, y: 360, isAgent: true },
  { id: "pa", label: "Procurement Agent", sub: "AI · OpenAI", level: 3, limit: "$45,000", x: 280, y: 360, isAgent: true },
  { id: "ta", label: "Treasury Agent", sub: "AI · Custom", level: 3, limit: "$100,000", x: 480, y: 360, isAgent: true },
];

const edges = [
  ["ceo", "cfo"], ["ceo", "cto"],
  ["cfo", "fd"], ["cfo", "pm"],
  ["fd", "fa"], ["pm", "pa"], ["cto", "ta"],
];

function AuthorityModelsTab() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selected = hierarchyNodes.find((n) => n.id === selectedNode);

  const getNodeById = (id: string) => hierarchyNodes.find((n) => n.id === id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
            Authority Hierarchy
          </p>
          <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
            Interactive delegation map showing authority relationships, approval chains, and escalation paths
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--pr-text-muted)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--pr-authority-blue)" }} />
            Human
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--pr-trust-green)" }} />
            AI Agent
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Graph */}
        <div
          className="col-span-2 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          <svg width="100%" viewBox="0 0 640 440" style={{ display: "block" }}>
            {/* Edges */}
            {edges.map(([from, to]) => {
              const a = getNodeById(from);
              const b = getNodeById(to);
              if (!a || !b) return null;
              return (
                <motion.line
                  key={`${from}-${to}`}
                  x1={a.x} y1={a.y + 20} x2={b.x} y2={b.y - 20}
                  stroke="rgba(77,124,254,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                />
              );
            })}

            {/* Nodes */}
            {hierarchyNodes.map((node, i) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <rect
                  x={node.x - 65}
                  y={node.y - 22}
                  width={130}
                  height={44}
                  rx={8}
                  fill={
                    selectedNode === node.id
                      ? node.isAgent ? "rgba(34,197,94,0.15)" : "rgba(77,124,254,0.15)"
                      : node.isAgent ? "rgba(34,197,94,0.06)" : "rgba(77,124,254,0.08)"
                  }
                  stroke={
                    selectedNode === node.id
                      ? node.isAgent ? "var(--pr-trust-green)" : "var(--pr-authority-blue)"
                      : node.isAgent ? "rgba(34,197,94,0.3)" : "rgba(77,124,254,0.25)"
                  }
                  strokeWidth="1.5"
                />
                <text x={node.x} y={node.y - 4} textAnchor="middle"
                  fill={node.isAgent ? "var(--pr-trust-green)" : "var(--pr-text-primary)"}
                  fontSize="12" fontWeight="600">
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 10} textAnchor="middle"
                  fill="rgba(148,163,184,0.8)" fontSize="10">
                  {node.sub}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        <div
          className="rounded-2xl border p-5"
          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <Shield className="w-8 h-8 mb-3" style={{ color: "var(--pr-text-disabled)" }} />
              <p className="text-sm text-center" style={{ color: "var(--pr-text-muted)" }}>
                Select a node to view authority details
              </p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selected.isAgent ? "rgba(34,197,94,0.12)" : "rgba(77,124,254,0.12)" }}
                >
                  <Shield className="w-4 h-4" style={{ color: selected.isAgent ? "var(--pr-trust-green)" : "var(--pr-authority-blue)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--pr-text-primary)" }}>{selected.label}</p>
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{selected.sub}</p>
                </div>
              </div>
              {[
                { label: "Delegated Authority", value: selected.isAgent ? "AI Agent" : "Human Principal" },
                { label: "Authority Limit", value: selected.limit },
                { label: "Level", value: `Level ${selected.level + 1}` },
                { label: "Escalation Path", value: selected.level === 0 ? "Board" : hierarchyNodes.find((n) => edges.find(([, t]) => t === selected.id && edges.find(([f]) => f === n.id)))?.label ?? "CEO" },
                { label: "Risk Ownership", value: selected.isAgent ? "Supervised" : "Full ownership" },
                { label: "Evidence Required", value: selected.isAgent ? "Yes — all actions" : "Approval logs" },
              ].map((r) => (
                <div key={r.label} className="py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "var(--pr-text-muted)" }}>{r.label}</p>
                  <p className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>{r.value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
