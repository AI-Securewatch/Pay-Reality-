import { useState } from "react";
import {
  Play, ArrowRight, Shield, FileText, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, GitBranch, Code2, BarChart3, ChevronDown,
  Plus, Settings, Eye, Layers, Target, TrendingUp, Activity,
} from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import { useNotify } from "../components/NotificationProvider";

const SIMULATION_TYPES = [
  { id: "single", label: "Single Action Simulation", icon: Zap, desc: "Simulate a single AI decision before execution" },
  { id: "workflow", label: "Multi-Step Workflow", icon: GitBranch, desc: "Simulate an entire workflow with multiple decisions" },
  { id: "custom", label: "Custom Scenario Builder", icon: Code2, desc: "Build completely custom governance scenarios" },
  { id: "whatif", label: "What-If Analysis", icon: BarChart3, desc: "Test governance changes before deployment" },
  { id: "intercept", label: "Decision Intercept Simulation", icon: Shield, desc: "Visualize the full PayReality governance process" },
];

const AUTHORITY_CATEGORIES = [
  { id: "financial", label: "Financial Authority" },
  { id: "vendor", label: "Vendor Authority" },
  { id: "hr", label: "HR Authority" },
  { id: "governance", label: "Governance Authority" },
  { id: "operations", label: "Operations Authority" },
  { id: "custom", label: "Custom Authority" },
];

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

const DECISION_TYPES = [
  "Payment Approval",
  "Vendor Creation",
  "Employee Creation",
  "Policy Change",
  "System Access",
  "Process Automation",
];

const AUTHORITY_CATEGORY_EXAMPLES: Record<string, { title: string; desc: string }[]> = {
  financial: [
    { title: "Wire Transfer Approval", desc: "Large payment requires CFO approval" },
    { title: "Daily Spending Limit", desc: "Agent cannot exceed daily threshold" },
    { title: "Vendor Payment", desc: "Payment to new vendor requires verification" },
  ],
  vendor: [
    { title: "Vendor Creation", desc: "New vendor requires procurement approval" },
    { title: "Banking Details", desc: "Banking changes require dual approval" },
    { title: "Vendor Risk Assessment", desc: "High-risk vendors require additional controls" },
  ],
  hr: [
    { title: "Employee Creation", desc: "New employee records require HR approval" },
    { title: "Role Assignment", desc: "Role changes require manager approval" },
    { title: "Compensation", desc: "Salary changes require executive approval" },
  ],
  operations: [
    { title: "System Access", desc: "System access requires IT approval" },
    { title: "Process Automation", desc: "Automation changes require validation" },
    { title: "Resource Allocation", desc: "Resource changes require approval" },
  ],
  governance: [
    { title: "Policy Changes", desc: "Policy modifications require governance approval" },
    { title: "Compliance Actions", desc: "Compliance reports require review" },
    { title: "Audit Requirements", desc: "Audit triggers require documentation" },
  ],
  custom: [
    { title: "Custom Rule 1", desc: "Define your own governance rule" },
    { title: "Custom Rule 2", desc: "Define your own governance rule" },
    { title: "Custom Rule 3", desc: "Define your own governance rule" },
  ],
};

export function GovernanceSimulation() {
  const { state } = useDemo();
  const notify = useNotify();
  const [activeSimulation, setActiveSimulation] = useState("intercept");
  const [authorityCategory, setAuthorityCategory] = useState("financial");
  const [customCategory, setCustomCategory] = useState("");
  const [categoryMode, setCategoryMode] = useState("Preset");

  // Single Action Simulation State
  const [singleActionInputs, setSingleActionInputs] = useState({
    agent: "",
    decisionType: "",
    decisionTypeMode: "Preset",
    customDecisionType: "",
    action: "",
    context: "",
    riskLevel: "Medium",
    riskLevelMode: "Preset",
    customRiskLevel: "",
  });

  // Decision Intercept Simulation State
  const [interceptStep, setInterceptStep] = useState(0);
  const [interceptDecision, setInterceptDecision] = useState({
    agent: "Finance Agent",
    action: "Wire Transfer",
    amount: "R250,000",
    recipient: "Vendor Corp",
    riskLevel: "High",
  });
  const [interceptResult, setInterceptResult] = useState<any>(null);

  const runSingleActionSimulation = () => {
    notify.success("Simulation complete - Authority evaluation generated");
  };

  const runDecisionIntercept = () => {
    setInterceptStep(1);
    
    // Simulate the decision intercept process
    setTimeout(() => setInterceptStep(2), 800);
    setTimeout(() => setInterceptStep(3), 1600);
    setTimeout(() => setInterceptStep(4), 2400);
    setTimeout(() => setInterceptStep(5), 3200);
    setTimeout(() => {
      setInterceptResult({
        authority: { status: "Approved", score: 87 },
        policy: { status: "Compliant", matchedPolicies: 3 },
        risk: { status: "High Risk", score: 72 },
        decision: "Escalate",
        evidence: "Evidence record generated: INT-2024-0624-001",
        explanation: "Transaction exceeds individual authority limit. Requires CFO approval due to high risk classification.",
      });
      setInterceptStep(6);
    }, 4000);
  };

  const resetIntercept = () => {
    setInterceptStep(0);
    setInterceptResult(null);
  };

  return (
    <div style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
                Governance Simulation Engine
              </span>
            </div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
              Governance Simulation Engine
            </h1>
            <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
              Test delegated authority, policy behavior, and governance outcomes before deployment
            </p>
          </div>
        </div>

        {/* Simulation Type Selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {SIMULATION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setActiveSimulation(type.id);
                  resetIntercept();
                }}
                className="px-4 py-3 rounded-xl border text-left transition-all whitespace-nowrap"
                style={{
                  backgroundColor: activeSimulation === type.id ? "var(--pr-authority-blue)" : "var(--pr-bg-card)",
                  borderColor: activeSimulation === type.id ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.07)",
                  color: activeSimulation === type.id ? "#fff" : "var(--pr-text-secondary)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
                <p className="text-xs" style={{ opacity: 0.8 }}>{type.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Authority Category Selector */}
        <div className="flex items-center gap-4 mb-5">
          <span className="text-sm" style={{ color: "var(--pr-text-muted)" }}>Authority Category:</span>
          <div className="flex gap-2">
            {["Preset", "Other", "Custom"].map((mode) => (
              <button
                key={mode}
                onClick={() => setCategoryMode(mode)}
                className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                style={{
                  backgroundColor: categoryMode === mode ? "var(--pr-authority-blue)" : "transparent",
                  borderColor: categoryMode === mode ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.1)",
                  color: categoryMode === mode ? "#fff" : "var(--pr-text-secondary)",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
          {categoryMode === "Preset" && (
            <select
              value={authorityCategory}
              onChange={(e) => setAuthorityCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            >
              {AUTHORITY_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          )}
          {(categoryMode === "Other" || categoryMode === "Custom") && (
            <input
              type="text"
              placeholder={categoryMode === "Other" ? "Enter authority category..." : "Define custom authority category..."}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
            />
          )}
        </div>

        {/* Context-Aware Examples */}
        {categoryMode === "Preset" && AUTHORITY_CATEGORY_EXAMPLES[authorityCategory] && (
          <div className="mb-5 p-4 rounded-xl border" style={{ backgroundColor: "rgba(77,124,254,0.05)", borderColor: "rgba(77,124,254,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" style={{ color: "var(--pr-authority-blue)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
                {AUTHORITY_CATEGORIES.find((c) => c.id === authorityCategory)?.label} Governance Examples
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AUTHORITY_CATEGORY_EXAMPLES[authorityCategory].map((example, index) => (
                <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: "var(--pr-bg-card)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>{example.title}</p>
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>{example.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simulation Content */}
      <div className="p-8">
        {/* Decision Intercept Simulation - Hero Feature */}
        {activeSimulation === "intercept" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                Decision Intercept Simulation
              </h2>
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Visualize the full PayReality governance process from decision to evidence
              </p>
            </div>

            {/* Input Configuration */}
            {!interceptResult && (
              <div className="p-6 rounded-xl border mb-8" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
                <h3 className="font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>Decision Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Agent</label>
                    <input
                      type="text"
                      value={interceptDecision.agent}
                      onChange={(e) => setInterceptDecision({ ...interceptDecision, agent: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Action</label>
                    <input
                      type="text"
                      value={interceptDecision.action}
                      onChange={(e) => setInterceptDecision({ ...interceptDecision, action: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Amount</label>
                    <input
                      type="text"
                      value={interceptDecision.amount}
                      onChange={(e) => setInterceptDecision({ ...interceptDecision, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Risk Level</label>
                    <select
                      value={interceptDecision.riskLevel}
                      onChange={(e) => setInterceptDecision({ ...interceptDecision, riskLevel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    >
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={runDecisionIntercept}
                  disabled={interceptStep > 0}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: interceptStep > 0 ? "var(--pr-text-muted)" : "var(--pr-authority-blue)",
                    color: "#fff",
                  }}
                >
                  <Play className="w-4 h-4" />
                  {interceptStep > 0 ? "Processing..." : "Run Decision Intercept"}
                </button>
              </div>
            )}

            {/* Visual Pipeline */}
            <div className="relative">
              {[
                { step: 1, label: "Decision Received", icon: Target, desc: "AI decision submitted for evaluation" },
                { step: 2, label: "Authority Evaluation", icon: Shield, desc: "Verify delegated authority limits" },
                { step: 3, label: "Policy Evaluation", icon: FileText, desc: "Check against governance policies" },
                { step: 4, label: "Risk Evaluation", icon: AlertTriangle, desc: "Assess risk level and exposure" },
                { step: 5, label: "Decision Outcome", icon: CheckCircle2, desc: "Allow, Escalate, or Deny" },
                { step: 6, label: "Evidence Generation", icon: Eye, desc: "Generate immutable evidence record" },
              ].map((stage, index) => {
                const isActive = interceptStep >= stage.step;
                const isCurrent = interceptStep === stage.step;
                const Icon = stage.icon;
                return (
                  <div key={stage.step} className="relative">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 mb-6"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? "var(--pr-authority-blue)" : "var(--pr-bg-card)",
                          border: isActive ? "2px solid var(--pr-authority-blue)" : "2px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: isActive ? "#fff" : "var(--pr-text-muted)" }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium" style={{ color: isActive ? "var(--pr-text-primary)" : "var(--pr-text-muted)" }}>
                            {stage.label}
                          </h4>
                          {isCurrent && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: "var(--pr-authority-blue)" }}
                            />
                          )}
                        </div>
                        <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{stage.desc}</p>
                      </div>
                      {index < 5 && (
                        <ArrowRight className="w-5 h-5 mt-6" style={{ color: isActive ? "var(--pr-authority-blue)" : "var(--pr-text-muted)" }} />
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Results */}
            {interceptResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 rounded-xl border"
                style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <h3 className="font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>Evaluation Results</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Authority Evaluation</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{interceptResult.authority.status}</p>
                    <p className="text-sm" style={{ color: "var(--pr-authority-blue)" }}>Score: {interceptResult.authority.score}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Policy Evaluation</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{interceptResult.policy.status}</p>
                    <p className="text-sm" style={{ color: "var(--pr-trust-green)" }}>{interceptResult.policy.matchedPolicies} policies matched</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Risk Evaluation</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{interceptResult.risk.status}</p>
                    <p className="text-sm" style={{ color: "var(--pr-warning-amber)" }}>Score: {interceptResult.risk.score}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: interceptResult.decision === "Allow" ? "rgba(34,197,94,0.1)" : interceptResult.decision === "Escalate" ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Decision Outcome</p>
                    <p className="font-medium" style={{ color: interceptResult.decision === "Allow" ? "var(--pr-trust-green)" : interceptResult.decision === "Escalate" ? "var(--pr-warning-amber)" : "var(--pr-critical-red)" }}>
                      {interceptResult.decision}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Explanation</p>
                  <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{interceptResult.explanation}</p>
                </div>
                <div className="p-4 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(77,124,254,0.05)", border: "1px solid rgba(77,124,254,0.2)" }}>
                  <Eye className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                  <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{interceptResult.evidence}</p>
                </div>
                <button
                  onClick={resetIntercept}
                  className="mt-4 px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-secondary)" }}
                >
                  Run New Simulation
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Single Action Simulation */}
        {activeSimulation === "single" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                Single Action Simulation
              </h2>
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Simulate a single AI decision before execution
              </p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Agent</label>
                  <select
                    value={singleActionInputs.agent}
                    onChange={(e) => setSingleActionInputs({ ...singleActionInputs, agent: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  >
                    <option value="">Select agent...</option>
                    {state.agents.map((agent) => (
                      <option key={agent.id} value={agent.name}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Decision Type</label>
                  <div className="flex gap-1 mb-2">
                    {["Preset", "Other", "Custom"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSingleActionInputs({ ...singleActionInputs, decisionTypeMode: mode })}
                        className="flex-1 px-2 py-1 rounded text-xs border transition-all"
                        style={{
                          backgroundColor: singleActionInputs.decisionTypeMode === mode ? "var(--pr-authority-blue)" : "transparent",
                          borderColor: singleActionInputs.decisionTypeMode === mode ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.1)",
                          color: singleActionInputs.decisionTypeMode === mode ? "#fff" : "var(--pr-text-secondary)",
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {singleActionInputs.decisionTypeMode === "Preset" && (
                    <select
                      value={singleActionInputs.decisionType}
                      onChange={(e) => setSingleActionInputs({ ...singleActionInputs, decisionType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    >
                      <option value="">Select decision type...</option>
                      {DECISION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  )}
                  {(singleActionInputs.decisionTypeMode === "Other" || singleActionInputs.decisionTypeMode === "Custom") && (
                    <input
                      type="text"
                      placeholder={singleActionInputs.decisionTypeMode === "Other" ? "Enter decision type..." : "Define custom decision type..."}
                      value={singleActionInputs.customDecisionType}
                      onChange={(e) => setSingleActionInputs({ ...singleActionInputs, customDecisionType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Action</label>
                  <input
                    type="text"
                    placeholder="e.g., Approve payment"
                    value={singleActionInputs.action}
                    onChange={(e) => setSingleActionInputs({ ...singleActionInputs, action: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Context</label>
                  <input
                    type="text"
                    placeholder="e.g., Vendor payment"
                    value={singleActionInputs.context}
                    onChange={(e) => setSingleActionInputs({ ...singleActionInputs, context: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Risk Level</label>
                  <div className="flex gap-1 mb-2">
                    {["Preset", "Other", "Custom"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSingleActionInputs({ ...singleActionInputs, riskLevelMode: mode })}
                        className="flex-1 px-2 py-1 rounded text-xs border transition-all"
                        style={{
                          backgroundColor: singleActionInputs.riskLevelMode === mode ? "var(--pr-authority-blue)" : "transparent",
                          borderColor: singleActionInputs.riskLevelMode === mode ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.1)",
                          color: singleActionInputs.riskLevelMode === mode ? "#fff" : "var(--pr-text-secondary)",
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {singleActionInputs.riskLevelMode === "Preset" && (
                    <select
                      value={singleActionInputs.riskLevel}
                      onChange={(e) => setSingleActionInputs({ ...singleActionInputs, riskLevel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    >
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  )}
                  {(singleActionInputs.riskLevelMode === "Other" || singleActionInputs.riskLevelMode === "Custom") && (
                    <input
                      type="text"
                      placeholder={singleActionInputs.riskLevelMode === "Other" ? "Enter risk level..." : "Define custom risk level..."}
                      value={singleActionInputs.customRiskLevel}
                      onChange={(e) => setSingleActionInputs({ ...singleActionInputs, customRiskLevel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                    />
                  )}
                </div>
              </div>
              <button
                onClick={runSingleActionSimulation}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </button>
            </div>
          </motion.div>
        )}

        {/* Multi-Step Workflow Simulation */}
        {activeSimulation === "workflow" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                Multi-Step Workflow Simulation
              </h2>
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Simulate an entire workflow consisting of multiple AI decisions
              </p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="mb-6">
                <h3 className="font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>Example: Vendor Onboarding Workflow</h3>
                <div className="space-y-3">
                  {[
                    { step: 1, action: "Create Vendor", status: "Pending" },
                    { step: 2, action: "Verify Tax Number", status: "Pending" },
                    { step: 3, action: "Approve Vendor", status: "Pending" },
                    { step: 4, action: "Activate Vendor", status: "Pending" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}>
                        {item.step}
                      </div>
                      <span className="flex-1 font-medium" style={{ color: "var(--pr-text-primary)" }}>{item.action}</span>
                      <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-muted)" }}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => notify.info("Workflow simulation coming soon")}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
              >
                <Play className="w-4 h-4" />
                Run Workflow Simulation
              </button>
            </div>
          </motion.div>
        )}

        {/* Custom Scenario Builder */}
        {activeSimulation === "custom" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                Custom Scenario Builder
              </h2>
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Build completely custom governance scenarios with no predefined restrictions
              </p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Agent</label>
                  <input
                    type="text"
                    placeholder="Define agent..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Decision</label>
                  <input
                    type="text"
                    placeholder="Define decision..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Context</label>
                  <input
                    type="text"
                    placeholder="Define context..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Risk Level</label>
                  <input
                    type="text"
                    placeholder="Define risk level..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Authority Type</label>
                  <input
                    type="text"
                    placeholder="Define authority type..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>Expected Outcome</label>
                  <input
                    type="text"
                    placeholder="Define expected outcome..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                  />
                </div>
              </div>
              <button
                onClick={() => notify.info("Custom scenario simulation coming soon")}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
              >
                <Play className="w-4 h-4" />
                Run Custom Scenario
              </button>
            </div>
          </motion.div>
        )}

        {/* What-If Analysis */}
        {activeSimulation === "whatif" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                What-If Analysis
              </h2>
              <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                Test governance changes before deployment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { title: "Increase Authority Limit", desc: "Test impact of raising transaction limits", icon: TrendingUp },
                { title: "Remove Human Approval", desc: "Simulate autonomous decision-making", icon: XCircle },
                { title: "Add Escalation Rule", desc: "Test new escalation thresholds", icon: Layers },
                { title: "Change Risk Threshold", desc: "Evaluate risk classification changes", icon: AlertTriangle },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 rounded-xl border cursor-pointer transition-all"
                  style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}
                  onClick={() => notify.info(`${item.title} analysis coming soon`)}
                >
                  <item.icon className="w-6 h-6 mb-3" style={{ color: "var(--pr-authority-blue)" }} />
                  <h3 className="font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.07)" }}>
              <h3 className="font-medium mb-4" style={{ color: "var(--pr-text-primary)" }}>Impact Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Governance Impact", value: "Moderate" },
                  { label: "Authority Exposure", value: "+15%" },
                  { label: "Risk Impact", value: "Low" },
                  { label: "Policy Impact", value: "3 policies affected" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>{item.label}</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
