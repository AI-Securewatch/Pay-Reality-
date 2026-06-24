import { useState } from "react";
import { Search, Download, Shield, CheckCircle2, Clock, AlertTriangle, Filter, FileText, ChevronRight, XCircle, ArrowRight, Calendar, User, Building2, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import { useNotify } from "../components/NotificationProvider";

interface EvidencePackage {
  id: string;
  agent: string;
  action: string;
  authority: string;
  policyEvaluation: string;
  decision: string;
  execution: string;
  timestamp: string;
  authorityCategory: string;
  delegatedPermissions: string[];
  approvalLimits: string;
  escalationThresholds: string;
  departmentOwner: string;
  policySnapshots: {
    name: string;
    result: string;
    conditions: { name: string; result: string }[];
  }[];
  timeline: {
    time: string;
    event: string;
  }[];
  isEscalated: boolean;
  isDenied: boolean;
  isException: boolean;
}

const MOCK_EVIDENCE_PACKAGES: EvidencePackage[] = [
  {
    id: "#2847",
    agent: "Vendor Onboarding Agent",
    action: "Create Vendor",
    authority: "Vendor Management Authority",
    policyEvaluation: "Passed",
    decision: "Approved",
    execution: "Completed",
    timestamp: "2026-06-25 13:14",
    authorityCategory: "Vendor Authority",
    delegatedPermissions: ["Create Vendor", "Update Vendor Details", "View Vendor History"],
    approvalLimits: "$50,000",
    escalationThresholds: "Banking Detail Changes",
    departmentOwner: "Procurement",
    policySnapshots: [
      {
        name: "Vendor Verification Policy",
        result: "Pass",
        conditions: [
          { name: "Tax Number Valid", result: "Pass" },
          { name: "Sanctions Check", result: "Pass" },
          { name: "Required Documents", result: "Pass" },
        ],
      },
    ],
    timeline: [
      { time: "13:14:01", event: "Request Received" },
      { time: "13:14:02", event: "Agent Identity Verified" },
      { time: "13:14:03", event: "Authority Evaluated" },
      { time: "13:14:04", event: "Policy Checks Completed" },
      { time: "13:14:04", event: "Approved" },
      { time: "13:14:06", event: "Executed" },
    ],
    isEscalated: false,
    isDenied: false,
    isException: false,
  },
  {
    id: "#2846",
    agent: "Treasury Payment Agent",
    action: "Wire Transfer",
    authority: "Financial Authority",
    policyEvaluation: "Passed",
    decision: "Approved",
    execution: "Completed",
    timestamp: "2026-06-25 12:45",
    authorityCategory: "Financial Authority",
    delegatedPermissions: ["Wire Transfer", "ACH Payment", "Check Request"],
    approvalLimits: "$100,000",
    escalationThresholds: ">$50,000 requires CFO approval",
    departmentOwner: "Finance",
    policySnapshots: [
      {
        name: "Payment Authorization Policy",
        result: "Pass",
        conditions: [
          { name: "Budget Available", result: "Pass" },
          { name: "Vendor Verified", result: "Pass" },
          { name: "Approval Chain Complete", result: "Pass" },
        ],
      },
    ],
    timeline: [
      { time: "12:45:01", event: "Request Received" },
      { time: "12:45:02", event: "Agent Identity Verified" },
      { time: "12:45:03", event: "Authority Evaluated" },
      { time: "12:45:04", event: "Policy Checks Completed" },
      { time: "12:45:05", event: "Escalated to CFO" },
      { time: "12:45:30", event: "CFO Approved" },
      { time: "12:45:32", event: "Executed" },
    ],
    isEscalated: true,
    isDenied: false,
    isException: false,
  },
  {
    id: "#2845",
    agent: "HR Agent",
    action: "Salary Adjustment",
    authority: "HR Authority",
    policyEvaluation: "Failed",
    decision: "Denied",
    execution: "Blocked",
    timestamp: "2026-06-25 11:30",
    authorityCategory: "HR Authority",
    delegatedPermissions: ["Employee Creation", "Role Assignment", "Access Requests"],
    approvalLimits: "Executive approval required",
    escalationThresholds: ">10% salary change",
    departmentOwner: "Human Resources",
    policySnapshots: [
      {
        name: "Compensation Policy",
        result: "Fail",
        conditions: [
          { name: "Budget Approval", result: "Fail" },
          { name: "Performance Review", result: "Pass" },
          { name: "Executive Authorization", result: "Fail" },
        ],
      },
    ],
    timeline: [
      { time: "11:30:01", event: "Request Received" },
      { time: "11:30:02", event: "Agent Identity Verified" },
      { time: "11:30:03", event: "Authority Evaluated" },
      { time: "11:30:04", event: "Policy Checks Failed" },
      { time: "11:30:04", event: "Denied" },
      { time: "11:30:04", event: "Blocked" },
    ],
    isEscalated: false,
    isDenied: true,
    isException: true,
  },
];

export function EvidenceVault() {
  const { state } = useDemo();
  const notify = useNotify();
  const [search, setSearch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<EvidencePackage | null>(null);
  const [activeTab, setActiveTab] = useState<"packages" | "exceptions">("packages");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    agent: "",
    authorityCategory: "",
    outcome: "",
    dateRange: "",
  });

  const filteredPackages = MOCK_EVIDENCE_PACKAGES.filter((pkg) => {
    if (activeTab === "exceptions" && !pkg.isDenied && !pkg.isEscalated && !pkg.isException) {
      return false;
    }
    if (activeTab === "packages" && (pkg.isDenied || pkg.isEscalated || pkg.isException)) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      pkg.id.toLowerCase().includes(q) ||
      pkg.agent.toLowerCase().includes(q) ||
      pkg.action.toLowerCase().includes(q) ||
      pkg.authority.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          Evidence Vault
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          The permanent repository of evidence generated by autonomous AI decisions, authority evaluations, policy checks, approvals, denials, escalations, and execution outcomes.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: activeTab === "packages" ? "var(--pr-authority-blue)" : "transparent",
            color: activeTab === "packages" ? "#fff" : "var(--pr-text-secondary)",
            borderColor: activeTab === "packages" ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.1)",
          }}
        >
          <FileCheck className="w-4 h-4 inline mr-2" />
          Evidence Packages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("exceptions")}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
          style={{
            backgroundColor: activeTab === "exceptions" ? "var(--pr-critical-red)" : "transparent",
            color: activeTab === "exceptions" ? "#fff" : "var(--pr-text-secondary)",
            borderColor: activeTab === "exceptions" ? "var(--pr-critical-red)" : "rgba(255,255,255,0.1)",
          }}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Escalations & Exceptions
        </button>
      </div>

      {/* Audit Search Bar */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: "var(--pr-text-muted)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Agent, Authority Category, Policy, Department, Date Range, or Outcome..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all"
              style={{
                backgroundColor: "var(--pr-bg-card)",
                borderColor: "rgba(255,255,255,0.05)",
                color: "var(--pr-text-primary)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 rounded-xl border transition-all"
            style={{
              backgroundColor: showFilters ? "rgba(77, 124, 254, 0.1)" : "var(--pr-bg-card)",
              borderColor: showFilters ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.05)",
              color: showFilters ? "var(--pr-authority-blue)" : "var(--pr-text-secondary)",
            }}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--pr-bg-card)",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>Agent</label>
                  <input
                    type="text"
                    value={filters.agent}
                    onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
                    placeholder="Filter by agent..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: "var(--pr-bg-hover)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "var(--pr-text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>Authority Category</label>
                  <select
                    value={filters.authorityCategory}
                    onChange={(e) => setFilters({ ...filters, authorityCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: "var(--pr-bg-hover)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "var(--pr-text-primary)",
                    }}
                  >
                    <option value="">All Categories</option>
                    <option value="Financial Authority">Financial Authority</option>
                    <option value="Vendor Authority">Vendor Authority</option>
                    <option value="HR Authority">HR Authority</option>
                    <option value="Governance Authority">Governance Authority</option>
                    <option value="Operations Authority">Operations Authority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>Outcome</label>
                  <select
                    value={filters.outcome}
                    onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: "var(--pr-bg-hover)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "var(--pr-text-primary)",
                    }}
                  >
                    <option value="">All Outcomes</option>
                    <option value="Approved">Approved</option>
                    <option value="Denied">Denied</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>Date Range</label>
                  <input
                    type="date"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{
                      backgroundColor: "var(--pr-bg-hover)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "var(--pr-text-primary)",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Evidence Packages List */}
      <div className="space-y-4">
        {filteredPackages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedPackage(pkg)}
            className="p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01]"
            style={{
              backgroundColor: "var(--pr-bg-card)",
              borderColor: pkg.isDenied || pkg.isEscalated ? "rgba(239, 68, 68, 0.3)" : "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: pkg.isDenied
                      ? "rgba(239, 68, 68, 0.1)"
                      : pkg.isEscalated
                        ? "rgba(245, 158, 11, 0.1)"
                        : "rgba(0, 212, 255, 0.1)",
                  }}
                >
                  {pkg.isDenied ? (
                    <XCircle className="w-6 h-6" style={{ color: "var(--pr-critical-red)" }} />
                  ) : pkg.isEscalated ? (
                    <AlertTriangle className="w-6 h-6" style={{ color: "var(--pr-warning-amber)" }} />
                  ) : (
                    <Shield className="w-6 h-6" style={{ color: "var(--pr-evidence-cyan)" }} />
                  )}
                </div>
                <div>
                  <p className="font-mono font-medium mb-1" style={{ color: "var(--pr-evidence-cyan)" }}>
                    Evidence Package {pkg.id}
                  </p>
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                    {pkg.timestamp}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-5 h-5" style={{ color: "var(--pr-text-muted)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Agent</p>
                <p className="font-medium text-sm" style={{ color: "var(--pr-text-primary)" }}>{pkg.agent}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Action</p>
                <p className="font-medium text-sm" style={{ color: "var(--pr-text-primary)" }}>{pkg.action}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Authority</p>
                <p className="font-medium text-sm" style={{ color: "var(--pr-text-primary)" }}>{pkg.authority}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Decision</p>
                <p
                  className="font-medium text-sm"
                  style={{
                    color: pkg.decision === "Approved"
                      ? "var(--pr-trust-green)"
                      : pkg.decision === "Denied"
                        ? "var(--pr-critical-red)"
                        : "var(--pr-warning-amber)",
                  }}
                >
                  {pkg.decision}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {pkg.isEscalated && (
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "var(--pr-warning-amber)" }}>ESCALATED</span>
              )}
              {pkg.isDenied && (
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--pr-critical-red)" }}>DENIED</span>
              )}
              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--pr-verification-purple)" }}>VERIFIED</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--pr-verification-purple)" }}>IMMUTABLE</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Evidence Package Detail Modal */}
      <AnimatePresence>
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
            onClick={() => setSelectedPackage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div>
                  <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
                    Evidence Package {selectedPackage.id}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>{selectedPackage.timestamp}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-all"
                  style={{ color: "var(--pr-text-muted)" }}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Agent</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.agent}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Action</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.action}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Authority</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.authority}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Policy Evaluation</p>
                    <p className="font-medium" style={{ color: selectedPackage.policyEvaluation === "Passed" ? "var(--pr-trust-green)" : "var(--pr-critical-red)" }}>{selectedPackage.policyEvaluation}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Decision</p>
                    <p className="font-medium" style={{ color: selectedPackage.decision === "Approved" ? "var(--pr-trust-green)" : "var(--pr-critical-red)" }}>{selectedPackage.decision}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Execution</p>
                    <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.execution}</p>
                  </div>
                </div>

                {/* Decision Timeline */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--pr-text-primary)" }}>
                    <Clock className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    Decision Timeline
                  </h3>
                  <div className="space-y-3">
                    {selectedPackage.timeline.map((event, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-mono" style={{ color: "var(--pr-text-muted)" }}>{event.time}</div>
                        <div className="w-px h-6" style={{ backgroundColor: "rgba(77, 124, 254, 0.3)" }} />
                        <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{event.event}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authority Snapshot */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--pr-text-primary)" }}>
                    <Shield className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    Authority Snapshot
                  </h3>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Authority Category</p>
                        <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.authorityCategory}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Permission</p>
                        <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.action}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Escalation</p>
                        <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.escalationThresholds}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Owner</p>
                        <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{selectedPackage.departmentOwner}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>Delegated Permissions</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPackage.delegatedPermissions.map((perm, idx) => (
                            <span key={idx} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "rgba(77, 124, 254, 0.1)", color: "var(--pr-authority-blue)" }}>{perm}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Policy Snapshot */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--pr-text-primary)" }}>
                    <FileCheck className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    Policy Snapshot
                  </h3>
                  <div className="space-y-3">
                    {selectedPackage.policySnapshots.map((policy, idx) => (
                      <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>{policy.name}</p>
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: policy.result === "Pass" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)", color: policy.result === "Pass" ? "var(--pr-trust-green)" : "var(--pr-critical-red)" }}>{policy.result}</span>
                        </div>
                        <div className="space-y-2">
                          {policy.conditions.map((condition, cIdx) => (
                            <div key={cIdx} className="flex items-center justify-between text-sm">
                              <span style={{ color: "var(--pr-text-secondary)" }}>{condition.name}</span>
                              <span style={{ color: condition.result === "Pass" ? "var(--pr-trust-green)" : "var(--pr-critical-red)" }}>{condition.result}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div className="pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-muted)" }}>Export Evidence</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "PDF Evidence Package", icon: FileText },
                      { label: "Audit Report", icon: FileText },
                      { label: "Governance Report", icon: FileText },
                      { label: "Compliance Export", icon: FileText },
                    ].map((exportOption, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => notify.success(`Exporting ${exportOption.label}...`)}
                        className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all"
                        style={{
                          backgroundColor: "rgba(77, 124, 254, 0.1)",
                          color: "var(--pr-authority-blue)",
                        }}
                      >
                        <exportOption.icon className="w-4 h-4" />
                        {exportOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
