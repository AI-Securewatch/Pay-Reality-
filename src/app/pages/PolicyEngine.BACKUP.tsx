import { useState } from "react";
import {
  Plus, X, FileText, Upload, Globe, Shield, ChevronRight,
  CheckCircle2, BarChart3, Zap, ArrowRight, Circle, ToggleLeft,
  Search, Filter, AlertTriangle, Clock, Layers, Code2, GitBranch,
} from "lucide-react";
import { motion } from "motion/react";

const TABS = [
  "Policy Library",
  "Document Intelligence",
  "Authority Models",
  "Approval Workflows",
  "Policy Simulator",
  "Coverage Analysis",
];

type Policy = {
  id: string;
  name: string;
  rule: string;
  active: boolean;
  triggered: number;
  agents: string[];
  category: string;
  lastModified: string;
  confidence?: number;
};

const initialPolicies: Policy[] = [
  {
    id: "p1",
    name: "High-Value Payment Control",
    rule: "IF Payment > $50,000 THEN Require CFO Approval + Generate VDE + Notify Audit Team",
    active: true,
    triggered: 247,
    agents: ["Finance Agent", "Treasury Agent"],
    category: "Financial Controls",
    lastModified: "2 hours ago",
    confidence: 98,
  },
  {
    id: "p2",
    name: "Cross-Border Dual Approval",
    rule: "IF Cross-Border Transfer THEN Require CFO + CEO Approval",
    active: true,
    triggered: 89,
    agents: ["Treasury Agent"],
    category: "Compliance",
    lastModified: "1 day ago",
    confidence: 96,
  },
  {
    id: "p3",
    name: "Vendor Whitelist Enforcement",
    rule: "IF Vendor NOT IN Approved List THEN Block + Escalate to Procurement",
    active: true,
    triggered: 12,
    agents: ["Procurement Agent", "Finance Agent"],
    category: "Vendor Controls",
    lastModified: "3 days ago",
    confidence: 99,
  },
  {
    id: "p4",
    name: "Weekend Transaction Freeze",
    rule: "IF Weekend OR After Hours THEN Require Manual Override",
    active: false,
    triggered: 0,
    agents: ["Finance Agent"],
    category: "Risk Controls",
    lastModified: "1 week ago",
    confidence: 94,
  },
  {
    id: "p5",
    name: "Payroll Disbursement Limit",
    rule: "IF Payroll Batch > $500,000 THEN Dual Approval Required + CFO Sign-Off",
    active: true,
    triggered: 34,
    agents: ["Payroll Agent"],
    category: "Financial Controls",
    lastModified: "5 hours ago",
    confidence: 97,
  },
];

type ModalView = null | "methods" | "manual" | "upload" | "import";

const categoryColors: Record<string, string> = {
  "Financial Controls": "var(--pr-authority-blue)",
  "Compliance": "var(--pr-verification-purple)",
  "Vendor Controls": "var(--pr-evidence-cyan)",
  "Risk Controls": "var(--pr-warning-amber)",
};

export function PolicyEngine() {
  const [activeTab, setActiveTab] = useState("Policy Library");
  const [modalView, setModalView] = useState<ModalView>(null);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "Financial Controls",
    condition: "",
    action: "",
    agents: "",
  });
  const [simulatorInputs, setSimulatorInputs] = useState({
    agent: "Finance Agent",
    action: "Wire Transfer",
    amount: "$250,000",
    department: "Finance",
    riskLevel: "Critical",
    environment: "Production",
  });
  const [simulated, setSimulated] = useState(false);

  const filteredPolicies = policies.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.rule.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleCreateManual = () => {
    if (!formData.name || !formData.condition || !formData.action) return;
    const newPolicy: Policy = {
      id: `p${Date.now()}`,
      name: formData.name,
      rule: `IF ${formData.condition} THEN ${formData.action}`,
      active: true,
      triggered: 0,
      agents: formData.agents ? formData.agents.split(",").map((a) => a.trim()) : [],
      category: formData.category,
      lastModified: "Just now",
      confidence: 100,
    };
    setPolicies((prev) => [newPolicy, ...prev]);
    setFormData({ name: "", category: "Financial Controls", condition: "", action: "", agents: "" });
    setModalView(null);
  };

  const activePolicies = policies.filter((p) => p.active).length;
  const totalTriggers = policies.reduce((sum, p) => sum + p.triggered, 0);

  return (
    <div style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="px-8 pt-8 pb-0 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
                Policy Engine
              </span>
            </div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
              Authority Control Center
            </h1>
            <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
              Transform governance frameworks into enforceable AI authority controls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150"
              style={{
                borderColor: "rgba(77,124,254,0.3)",
                color: "var(--pr-authority-blue)",
                backgroundColor: "rgba(77,124,254,0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.08)";
              }}
              onClick={() => setModalView("upload")}
            >
              Upload Documents
            </button>
            <button
              onClick={() => setModalView("methods")}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150"
              style={{
                backgroundColor: "var(--pr-authority-blue)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#5D8CFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--pr-authority-blue)";
              }}
            >
              <Plus className="w-4 h-4" />
              Create Policy
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-8 mb-5">
          {[
            { label: "Active Policies", value: activePolicies, color: "var(--pr-trust-green)" },
            { label: "Total Triggers Today", value: totalTriggers.toLocaleString(), color: "var(--pr-authority-blue)" },
            { label: "Coverage Score", value: "94%", color: "var(--pr-evidence-cyan)" },
            { label: "Awaiting Review", value: "3", color: "var(--pr-warning-amber)" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-lg font-semibold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap"
              style={{
                borderBottomColor:
                  activeTab === tab ? "var(--pr-authority-blue)" : "transparent",
                color:
                  activeTab === tab
                    ? "var(--pr-text-primary)"
                    : "var(--pr-text-muted)",
                backgroundColor: "transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === "Policy Library" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search and Filter */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--pr-text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--pr-bg-card)",
                    borderColor: "rgba(255,255,255,0.07)",
                    color: "var(--pr-text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--pr-authority-blue)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  }}
                />
              </div>
              <button
                className="px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: "var(--pr-bg-card)",
                  borderColor: "rgba(255,255,255,0.07)",
                  color: "var(--pr-text-secondary)",
                }}
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {/* Policy List */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "var(--pr-bg-card)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {/* Table Header */}
              <div
                className="grid text-xs font-medium px-5 py-3 border-b"
                style={{
                  gridTemplateColumns: "2fr 3fr 120px 90px 120px 100px",
                  borderColor: "rgba(255,255,255,0.05)",
                  color: "var(--pr-text-muted)",
                }}
              >
                <span>POLICY NAME</span>
                <span>AUTHORITY RULE</span>
                <span>CATEGORY</span>
                <span>STATUS</span>
                <span>TRIGGERS</span>
                <span className="text-right">ACTIONS</span>
              </div>

              {filteredPolicies.length === 0 ? (
                <div className="py-16 text-center">
                  <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--pr-text-disabled)" }} />
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                    No policies found
                  </p>
                </div>
              ) : (
                filteredPolicies.map((policy, index) => (
                  <motion.div
                    key={policy.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.04 }}
                    className="grid items-center px-5 py-4 border-b cursor-pointer transition-all duration-100 group"
                    style={{
                      gridTemplateColumns: "2fr 3fr 120px 90px 120px 100px",
                      borderColor: "rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium mb-0.5" style={{ color: "var(--pr-text-primary)" }}>
                        {policy.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                        {policy.agents.join(", ")}
                      </p>
                    </div>

                    <div
                      className="text-xs font-mono mr-4 truncate py-1 px-2 rounded"
                      style={{
                        color: "var(--pr-evidence-cyan)",
                        backgroundColor: "rgba(0,212,255,0.06)",
                      }}
                    >
                      {policy.rule}
                    </div>

                    <div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          color: categoryColors[policy.category] ?? "var(--pr-text-muted)",
                          backgroundColor: `${categoryColors[policy.category] ?? "#94A3B8"}15`,
                        }}
                      >
                        {policy.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePolicy(policy.id)}
                        className="flex items-center gap-1.5 transition-all"
                      >
                        <div
                          className="w-7 h-4 rounded-full relative transition-all"
                          style={{
                            backgroundColor: policy.active ? "var(--pr-trust-green)" : "rgba(255,255,255,0.1)",
                          }}
                        >
                          <div
                            className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                            style={{
                              backgroundColor: "#fff",
                              left: policy.active ? "calc(100% - 14px)" : "2px",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: policy.active ? "var(--pr-trust-green)" : "var(--pr-text-muted)" }}
                        >
                          {policy.active ? "Active" : "Off"}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" style={{ color: "var(--pr-warning-amber)" }} />
                      <span className="text-sm font-mono" style={{ color: "var(--pr-text-secondary)" }}>
                        {policy.triggered.toLocaleString()}
                      </span>
                      <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>today</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-xs px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                        style={{
                          color: "var(--pr-authority-blue)",
                          backgroundColor: "rgba(77,124,254,0.1)",
                        }}
                        onClick={() => alert(`Edit policy: ${policy.name}`)}
                      >
                        Edit
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "Document Intelligence" && (
          <DocumentIntelligenceTab />
        )}

        {activeTab === "Policy Simulator" && (
          <PolicySimulatorTab
            inputs={simulatorInputs}
            setInputs={setSimulatorInputs}
            simulated={simulated}
            setSimulated={setSimulated}
          />
        )}

        {activeTab === "Coverage Analysis" && (
          <CoverageAnalysisTab />
        )}

        {(activeTab === "Authority Models" || activeTab === "Approval Workflows") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(77,124,254,0.1)" }}
            >
              {activeTab === "Authority Models" ? (
                <GitBranch className="w-8 h-8" style={{ color: "var(--pr-authority-blue)" }} />
              ) : (
                <Layers className="w-8 h-8" style={{ color: "var(--pr-authority-blue)" }} />
              )}
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>
              {activeTab}
            </h3>
            <p className="text-sm text-center max-w-sm" style={{ color: "var(--pr-text-muted)" }}>
              Upload a Delegation of Authority document to automatically generate your{" "}
              {activeTab === "Authority Models" ? "authority model" : "approval workflows"}.
            </p>
            <button
              onClick={() => setModalView("upload")}
              className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </button>
          </motion.div>
        )}
      </div>

      {/* Create Policy Modal */}
      {modalView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setModalView(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border w-full overflow-hidden"
            style={{
              backgroundColor: "var(--pr-bg-secondary)",
              borderColor: "rgba(255,255,255,0.1)",
              maxWidth: modalView === "methods" ? "760px" : "580px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div>
                {modalView === "methods" && (
                  <>
                    <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                      Policy Engine
                    </p>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                      Create Authority Policy
                    </h2>
                  </>
                )}
                {modalView === "manual" && (
                  <>
                    <button
                      className="text-xs mb-1 flex items-center gap-1 transition-all"
                      style={{ color: "var(--pr-text-muted)" }}
                      onClick={() => setModalView("methods")}
                    >
                      ← Back to methods
                    </button>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                      Build Policy Manually
                    </h2>
                  </>
                )}
                {modalView === "upload" && (
                  <>
                    <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                      Document Intelligence
                    </p>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                      Upload Governance Documents
                    </h2>
                  </>
                )}
                {modalView === "import" && (
                  <>
                    <button
                      className="text-xs mb-1"
                      style={{ color: "var(--pr-text-muted)" }}
                      onClick={() => setModalView("methods")}
                    >
                      ← Back to methods
                    </button>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                      Import Compliance Framework
                    </h2>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalView(null)}
                className="p-2 rounded-lg transition-all"
                style={{ color: "var(--pr-text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Method Selection */}
              {modalView === "methods" && (
                <div className="grid grid-cols-3 gap-4">
                  {/* Create Manually */}
                  <button
                    className="flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-150 group"
                    style={{
                      backgroundColor: "var(--pr-bg-card)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                    onClick={() => setModalView("manual")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--pr-authority-blue)";
                      e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.backgroundColor = "var(--pr-bg-card)";
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(77,124,254,0.12)" }}
                    >
                      <Code2 className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    </div>
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                      Create Manually
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
                      Build custom authority policies using the visual policy builder.
                    </p>
                    <div className="space-y-1 mb-4">
                      {["Approval Rules", "Risk Controls", "Escalation Logic", "Evidence Requirements"].map((cap) => (
                        <div key={cap} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "var(--pr-authority-blue)" }} />
                          <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{cap}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: "var(--pr-authority-blue)" }}>
                      Create Policy <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Upload Documents — RECOMMENDED */}
                  <button
                    className="flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-150 relative"
                    style={{
                      backgroundColor: "rgba(77,124,254,0.08)",
                      borderColor: "var(--pr-authority-blue)",
                    }}
                    onClick={() => setModalView("upload")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.14)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.08)";
                    }}
                  >
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}>
                      Recommended
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(77,124,254,0.2)" }}
                    >
                      <Upload className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    </div>
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                      Upload Documents
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
                      Upload existing governance documents and auto-generate enforceable controls.
                    </p>
                    <div className="space-y-1 mb-4">
                      {["PDF", "DOCX", "TXT", "HTML"].map((fmt) => (
                        <div key={fmt} className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 flex-shrink-0" style={{ color: "var(--pr-evidence-cyan)" }} />
                          <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{fmt}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: "var(--pr-authority-blue)" }}>
                      Upload Documents <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Import Framework */}
                  <button
                    className="flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-150"
                    style={{
                      backgroundColor: "var(--pr-bg-card)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                    onClick={() => setModalView("import")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--pr-verification-purple)";
                      e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.backgroundColor = "var(--pr-bg-card)";
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(139,92,246,0.12)" }}
                    >
                      <Globe className="w-5 h-5" style={{ color: "var(--pr-verification-purple)" }} />
                    </div>
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                      Import Framework
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
                      Import external governance and compliance frameworks.
                    </p>
                    <div className="space-y-1 mb-4">
                      {["ISO 42001", "ISO 27001", "SOC 2", "NIST AI RMF", "EU AI Act"].map((fw) => (
                        <div key={fw} className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "var(--pr-verification-purple)" }} />
                          <span className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{fw}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: "var(--pr-verification-purple)" }}>
                      Import Framework <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              )}

              {/* Manual Policy Builder */}
              {modalView === "manual" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
                      Policy Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High-Value Payment Control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "var(--pr-bg-card)",
                        borderColor: "rgba(255,255,255,0.08)",
                        color: "var(--pr-text-primary)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                      style={{
                        backgroundColor: "var(--pr-bg-card)",
                        borderColor: "rgba(255,255,255,0.08)",
                        color: "var(--pr-text-primary)",
                      }}
                    >
                      {["Financial Controls", "Compliance", "Vendor Controls", "Risk Controls"].map((c) => (
                        <option key={c} value={c} style={{ backgroundColor: "var(--pr-bg-secondary)" }}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs font-mono mb-3" style={{ color: "var(--pr-evidence-cyan)" }}>
                      RULE BUILDER
                    </p>
                    <div className="flex items-start gap-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-mono font-semibold flex-shrink-0 mt-2"
                        style={{ backgroundColor: "rgba(0,212,255,0.1)", color: "var(--pr-evidence-cyan)" }}
                      >
                        IF
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Payment > $50,000"
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none resize-none font-mono transition-all"
                        style={{
                          backgroundColor: "var(--pr-bg-secondary)",
                          borderColor: "rgba(255,255,255,0.06)",
                          color: "var(--pr-text-primary)",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-evidence-cyan)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                      />
                    </div>
                    <div className="flex items-start gap-3 mt-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-mono font-semibold flex-shrink-0 mt-2"
                        style={{ backgroundColor: "rgba(77,124,254,0.1)", color: "var(--pr-authority-blue)" }}
                      >
                        THEN
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Require CFO Approval + Generate Evidence"
                        value={formData.action}
                        onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none resize-none font-mono transition-all"
                        style={{
                          backgroundColor: "var(--pr-bg-secondary)",
                          borderColor: "rgba(255,255,255,0.06)",
                          color: "var(--pr-text-primary)",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
                      Affected Agents (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="Finance Agent, Treasury Agent"
                      value={formData.agents}
                      onChange={(e) => setFormData({ ...formData, agents: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "var(--pr-bg-card)",
                        borderColor: "rgba(255,255,255,0.08)",
                        color: "var(--pr-text-primary)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--pr-authority-blue)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setModalView("methods")}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        color: "var(--pr-text-secondary)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateManual}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: !formData.name || !formData.condition || !formData.action
                          ? "rgba(77,124,254,0.3)"
                          : "var(--pr-authority-blue)",
                        color: "#fff",
                        cursor: !formData.name || !formData.condition || !formData.action ? "not-allowed" : "pointer",
                      }}
                    >
                      Create Policy
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Documents */}
              {modalView === "upload" && (
                <UploadDocumentsView onClose={() => setModalView(null)} />
              )}

              {/* Import Framework */}
              {modalView === "import" && (
                <ImportFrameworkView onClose={() => setModalView(null)} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function UploadDocumentsView({ onClose }: { onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState([
    "Delegation of Authority.pdf",
    "Finance Policy.pdf",
  ]);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);

  const stages = [
    { label: "Document Processing", sub: "Extracting content" },
    { label: "Control Discovery", sub: "Identifying governance controls" },
    { label: "Authority Detection", sub: "Finding delegated authority structures" },
    { label: "Policy Translation", sub: "Converting controls into policies" },
    { label: "Evidence Mapping", sub: "Determining required evidence" },
    { label: "Validation", sub: "Detecting ambiguities and conflicts" },
  ];

  const startProcessing = () => {
    setProcessing(true);
    setStage(0);
    const interval = setInterval(() => {
      setStage((prev) => {
        if (prev >= stages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
  };

  return (
    <div className="space-y-4">
      {!processing ? (
        <>
          <div
            className="border-2 border-dashed rounded-xl p-10 text-center transition-all"
            style={{
              borderColor: dragging ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.1)",
              backgroundColor: dragging ? "rgba(77,124,254,0.05)" : "var(--pr-bg-card)",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const files = Array.from(e.dataTransfer.files);
              setUploaded((prev) => [...prev, ...files.map((f) => f.name)]);
            }}
          >
            <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--pr-authority-blue)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
              Drop governance documents here
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--pr-text-muted)" }}>
              PDF, DOCX, TXT, HTML supported
            </p>
            <label className="inline-block px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{ backgroundColor: "rgba(77,124,254,0.1)", color: "var(--pr-authority-blue)" }}>
              Browse Files
              <input type="file" className="hidden" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setUploaded((prev) => [...prev, ...files.map((f) => f.name)]);
              }} />
            </label>
          </div>

          {uploaded.length > 0 && (
            <div className="space-y-2">
              {uploaded.map((name) => (
                <div key={name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "var(--pr-bg-card)" }}>
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--pr-evidence-cyan)" }} />
                  <span className="text-sm flex-1" style={{ color: "var(--pr-text-secondary)" }}>{name}</span>
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--pr-trust-green)" }} />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={startProcessing}
              disabled={uploaded.length === 0}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: uploaded.length === 0 ? "rgba(77,124,254,0.3)" : "var(--pr-authority-blue)",
                color: "#fff",
              }}
            >
              Analyze Documents
            </button>
          </div>
        </>
      ) : (
        <div>
          <p className="text-sm mb-4 text-center" style={{ color: "var(--pr-text-muted)" }}>
            Analyzing {uploaded.length} document{uploaded.length > 1 ? "s" : ""}...
          </p>
          <div className="space-y-3">
            {stages.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    backgroundColor:
                      i < stage ? "var(--pr-trust-green)"
                      : i === stage ? "var(--pr-authority-blue)"
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {i < stage ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : i === stage ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 rounded-full border-2 border-white border-t-transparent"
                    />
                  ) : (
                    <Circle className="w-3 h-3" style={{ color: "var(--pr-text-disabled)" }} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: i <= stage ? "var(--pr-text-primary)" : "var(--pr-text-disabled)" }}>
                    {s.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{s.sub}</p>
                </div>
                {i === stage && (
                  <span className="ml-auto text-xs animate-pulse" style={{ color: "var(--pr-authority-blue)" }}>
                    Processing...
                  </span>
                )}
              </div>
            ))}
          </div>
          {stage === stages.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl border"
              style={{ backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: "var(--pr-trust-green)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--pr-trust-green)" }}>
                  18 Enforceable Controls Discovered
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Policies Found", value: "18" },
                  { label: "Authority Rules", value: "7" },
                  { label: "Approval Chains", value: "12" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-xl font-semibold font-mono" style={{ color: "var(--pr-text-primary)" }}>{item.value}</p>
                    <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-full mt-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
              >
                Review & Approve Controls
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function ImportFrameworkView({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const frameworks = [
    { id: "iso42001", name: "ISO 42001", desc: "AI Management Systems", badge: "AI Governance" },
    { id: "iso27001", name: "ISO 27001", desc: "Information Security Management", badge: "Security" },
    { id: "soc2", name: "SOC 2", desc: "Service Organization Controls", badge: "Compliance" },
    { id: "nist", name: "NIST AI RMF", desc: "AI Risk Management Framework", badge: "Risk" },
    { id: "euai", name: "EU AI Act", desc: "European Union AI Regulation", badge: "Regulation" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {frameworks.map((fw) => (
          <button
            key={fw.id}
            onClick={() => setSelected(fw.id === selected ? null : fw.id)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all"
            style={{
              backgroundColor: fw.id === selected ? "rgba(77,124,254,0.08)" : "var(--pr-bg-card)",
              borderColor: fw.id === selected ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(139,92,246,0.12)" }}
            >
              <Shield className="w-4 h-4" style={{ color: "var(--pr-verification-purple)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>{fw.name}</p>
              <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{fw.desc}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "var(--pr-verification-purple)" }}
            >
              {fw.badge}
            </span>
            {fw.id === selected && (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--pr-authority-blue)" }} />
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-sm border"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--pr-text-secondary)" }}
        >
          Cancel
        </button>
        <button
          onClick={() => { alert(`Importing ${selected}`); onClose(); }}
          disabled={!selected}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: !selected ? "rgba(77,124,254,0.3)" : "var(--pr-authority-blue)",
            color: "#fff",
          }}
        >
          Import Framework
        </button>
      </div>
    </div>
  );
}

function PolicySimulatorTab({
  inputs, setInputs, simulated, setSimulated,
}: {
  inputs: Record<string, string>;
  setInputs: (v: Record<string, string>) => void;
  simulated: boolean;
  setSimulated: (v: boolean) => void;
}) {
  const handleSimulate = () => setSimulated(true);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--pr-authority-blue)" }}>
            Simulation Inputs
          </p>
          <div className="space-y-4">
            {[
              { key: "agent", label: "Agent", options: ["Finance Agent", "Treasury Agent", "Payroll Agent", "Procurement Agent"] },
              { key: "action", label: "Action", options: ["Wire Transfer", "Purchase Order", "Payroll Run", "Vendor Payment"] },
              { key: "amount", label: "Amount" },
              { key: "department", label: "Department", options: ["Finance", "Procurement", "Legal", "Operations"] },
              { key: "riskLevel", label: "Risk Level", options: ["Low", "Medium", "High", "Critical"] },
              { key: "environment", label: "Environment", options: ["Production", "Staging", "Testing"] },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>{field.label}</label>
                {field.options ? (
                  <select
                    value={inputs[field.key]}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-secondary)", borderColor: "rgba(255,255,255,0.07)", color: "var(--pr-text-primary)" }}
                  >
                    {field.options.map((o) => <option key={o} value={o} style={{ backgroundColor: "var(--pr-bg-secondary)" }}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={inputs[field.key]}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-secondary)", borderColor: "rgba(255,255,255,0.07)", color: "var(--pr-text-primary)" }}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleSimulate}
            className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#5D8CFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--pr-authority-blue)"; }}
          >
            <Zap className="w-4 h-4" />
            Run Simulation
          </button>
        </div>

        {/* Output */}
        <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--pr-evidence-cyan)" }}>
            Simulation Results
          </p>
          {!simulated ? (
            <div className="flex flex-col items-center justify-center h-64">
              <BarChart3 className="w-10 h-10 mb-3" style={{ color: "var(--pr-text-disabled)" }} />
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Run a simulation to see results
              </p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {[
                { label: "Triggered Policies", value: "2 policies", color: "var(--pr-warning-amber)" },
                { label: "Required Approvals", value: "CFO + CEO", color: "var(--pr-authority-blue)" },
                { label: "Authority Verified", value: "Yes", color: "var(--pr-trust-green)" },
                { label: "Risk Score", value: "Critical (9.2/10)", color: "var(--pr-critical-red)" },
                { label: "Evidence Generated", value: "VDE + Audit Log", color: "var(--pr-evidence-cyan)" },
                { label: "Insurance Impact", value: "Coverage Active", color: "var(--pr-trust-green)" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{r.label}</span>
                  <span className="text-sm font-medium" style={{ color: r.color }}>{r.value}</span>
                </div>
              ))}
              <div className="pt-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--pr-critical-red)" }}>Outcome: BLOCKED</p>
                <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                  This action requires dual executive approval before execution. Two approvers must confirm within 4 hours.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
function DocumentIntelligenceTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">
          Document Intelligence
        </h3>
        <p className="text-sm opacity-70 mt-1">
          Upload delegation policies, approval matrices, SOPs, and governance
          documents to automatically extract authority controls.
        </p>
      </div>

      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h4 className="text-lg font-medium mb-2">
          Upload Governance Documents
        </h4>

        <p className="text-sm opacity-70 mb-6">
          Extract policies, approval workflows, authority limits, and evidence
          requirements from enterprise documents.
        </p>

        <button
          className="px-4 py-2 rounded-lg"
          style={{
            background: "var(--pr-authority-blue)",
            color: "white",
          }}
        >
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 border">
          <div className="text-2xl font-bold">18</div>
          <div className="text-sm opacity-70">Policies Found</div>
        </div>

        <div className="rounded-xl p-4 border">
          <div className="text-2xl font-bold">7</div>
          <div className="text-sm opacity-70">Authority Rules</div>
        </div>

        <div className="rounded-xl p-4 border">
          <div className="text-2xl font-bold">12</div>
          <div className="text-sm opacity-70">Approval Chains</div>
        </div>

        <div className="rounded-xl p-4 border">
          <div className="text-2xl font-bold">14</div>
          <div className="text-sm opacity-70">Evidence Requirements</div>
        </div>
      </div>
    </div>
  );
}
function CoverageAnalysisTab() {
  const gaps = [
    { area: "Cross-Border Payments", gap: "Missing dual-approval for amounts > $100k", severity: "High" },
    { area: "Vendor Onboarding", gap: "No evidence requirement for new vendors", severity: "Medium" },
    { area: "Payroll Adjustments", gap: "Escalation threshold not defined", severity: "Low" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Detected Controls", value: "18", color: "var(--pr-text-primary)" },
          { label: "Enforceable", value: "15", color: "var(--pr-trust-green)" },
          { label: "Requires Review", value: "3", color: "var(--pr-warning-amber)" },
          { label: "Coverage", value: "83%", color: "var(--pr-authority-blue)" },
          { label: "Conflicts", value: "1", color: "var(--pr-critical-red)" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-2xl font-semibold font-mono mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>Control Gaps</p>
        <div className="space-y-3">
          {gaps.map((gap) => (
            <div key={gap.area} className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
              <AlertTriangle
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: gap.severity === "High" ? "var(--pr-critical-red)" : gap.severity === "Medium" ? "var(--pr-warning-amber)" : "var(--pr-text-muted)" }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium mb-0.5" style={{ color: "var(--pr-text-primary)" }}>{gap.area}</p>
                <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{gap.gap}</p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: gap.severity === "High" ? "rgba(239,68,68,0.1)" : gap.severity === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(148,163,184,0.1)",
                  color: gap.severity === "High" ? "var(--pr-critical-red)" : gap.severity === "Medium" ? "var(--pr-warning-amber)" : "var(--pr-text-muted)",
                }}
              >
                {gap.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
