import { useState } from "react";
import { Search, Download, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import { useNotify } from "../components/NotificationProvider";

export function EvidenceVault() {
  const { state } = useDemo();
  const notify = useNotify();
  const [search, setSearch] = useState("");

  const filtered = state.evidence.filter((record) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      record.id.toLowerCase().includes(q) ||
      record.agent.toLowerCase().includes(q) ||
      record.action.toLowerCase().includes(q) ||
      record.decisionId.toLowerCase().includes(q) ||
      record.hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          Evidence Vault
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Cryptographically verified, immutable audit trail of all AI decisions
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: "var(--pr-text-muted)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Evidence ID, Agent, Decision, Date, or Hash..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all"
            style={{
              backgroundColor: "var(--pr-bg-card)",
              borderColor: "rgba(255,255,255,0.05)",
              color: "var(--pr-text-primary)",
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((record, index) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border"
            style={{
              backgroundColor: "var(--pr-bg-card)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0, 212, 255, 0.1)" }}
                >
                  <Shield className="w-6 h-6" style={{ color: "var(--pr-evidence-cyan)" }} />
                </div>
                <div>
                  <p className="font-mono font-medium mb-1" style={{ color: "var(--pr-evidence-cyan)" }}>
                    {record.id}
                  </p>
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                    {record.timestamp} · Decision {record.decisionId}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      record.status === "VERIFIED"
                        ? "rgba(34, 197, 94, 0.1)"
                        : record.status === "PENDING"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  <CheckCircle2
                    className="w-4 h-4"
                    style={{
                      color:
                        record.status === "VERIFIED"
                          ? "var(--pr-trust-green)"
                          : record.status === "PENDING"
                            ? "var(--pr-warning-amber)"
                            : "var(--pr-critical-red)",
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        record.status === "VERIFIED"
                          ? "var(--pr-trust-green)"
                          : record.status === "PENDING"
                            ? "var(--pr-warning-amber)"
                            : "var(--pr-critical-red)",
                    }}
                  >
                    {record.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify.success(`Evidence package ${record.id} downloaded`)
                  }
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                  style={{
                    backgroundColor: "rgba(77, 124, 254, 0.1)",
                    color: "var(--pr-authority-blue)",
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Agent Identity
                </p>
                <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                  {record.agent}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Action
                </p>
                <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                  {record.action}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Authority Outcome
                </p>
                <p className="font-medium text-sm" style={{ color: "var(--pr-text-primary)" }}>
                  {record.authorityOutcome}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Approval Outcome
                </p>
                <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                  {record.approvalOutcome}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Policies Evaluated
                </p>
                <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                  {record.policiesEvaluated.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Risk Classification
                </p>
                <p className="font-medium" style={{ color: "var(--pr-warning-amber)" }}>
                  {record.riskClassification}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Human Approval
                </p>
                <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                  {record.approver}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                  Decision Hash
                </p>
                <p className="font-mono text-sm" style={{ color: "var(--pr-verification-purple)" }}>
                  {record.hash}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {["VERIFIED", "IMMUTABLE", "AUDIT READY"].map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    color: "var(--pr-verification-purple)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
