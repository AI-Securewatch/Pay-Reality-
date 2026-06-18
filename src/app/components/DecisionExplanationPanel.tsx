import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  GitBranch,
  FileText,
  Building2,
  Database,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { buildDecisionExplanation } from "../demo/decisionExplanation";
import type { DemoState } from "../demo/demoTypes";
import type { ApprovalChainStep, EvidenceArtifactView } from "../demo/decisionExplanation";
import { Link } from "react-router";

const cardStyle = {
  backgroundColor: "var(--pr-bg-card)",
  borderColor: "rgba(255,255,255,0.07)",
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-xs font-medium mb-3 uppercase tracking-wider"
      style={{ color: "var(--pr-text-muted)" }}
    >
      {children}
    </p>
  );
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "resolved":
    case "completed":
    case "verified":
    case "auto-approved":
      return "var(--pr-trust-green)";
    case "pending":
    case "generated":
    case "current":
      return "var(--pr-warning-amber)";
    case "rejected":
    case "blocked":
      return "var(--pr-critical-red)";
    default:
      return "var(--pr-text-muted)";
  }
}

function getRiskColor(risk: string) {
  switch (risk.toLowerCase()) {
    case "critical":
      return "var(--pr-critical-red)";
    case "high":
      return "var(--pr-warning-amber)";
    case "medium":
      return "var(--pr-evidence-cyan)";
    case "low":
      return "var(--pr-trust-green)";
    default:
      return "var(--pr-text-muted)";
  }
}

function ChainStepIcon({ status }: { status: ApprovalChainStep["status"] }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4" style={{ color: "var(--pr-trust-green)" }} />;
  if (status === "blocked") return <XCircle className="w-4 h-4" style={{ color: "var(--pr-critical-red)" }} />;
  return <Clock className="w-4 h-4" style={{ color: "var(--pr-warning-amber)" }} />;
}

function EvidenceStatusBadge({ status }: { status: EvidenceArtifactView["status"] }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `${getStatusColor(status)}15`,
        color: getStatusColor(status),
      }}
    >
      {status}
    </span>
  );
}

interface DecisionExplanationPanelProps {
  state: DemoState;
  interceptId: string | null;
  onClose: () => void;
}

export function DecisionExplanationPanel({
  state,
  interceptId,
  onClose,
}: DecisionExplanationPanelProps) {
  const explanation = interceptId ? buildDecisionExplanation(state, interceptId) : null;
  const open = !!explanation;

  if (!explanation) {
    return (
      <Sheet open={false} onOpenChange={() => onClose()}>
        <SheetContent side="right" className="hidden" />
      </Sheet>
    );
  }

  const { intercept, approval, evidence, policies, reasoning, approvalChain, evidenceArtifacts, insuranceImpact, timeline } =
    explanation;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto border-l p-0"
        style={{
          backgroundColor: "var(--pr-bg-secondary)",
          borderColor: "rgba(255,255,255,0.08)",
          color: "var(--pr-text-primary)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
                Decision Explanation
              </span>
            </div>
            <SheetTitle className="text-left text-xl font-semibold" style={{ color: "var(--pr-text-primary)" }}>
              {intercept.id}
            </SheetTitle>
            <SheetDescription className="text-left space-y-2 mt-2">
              <p className="text-base font-medium" style={{ color: "var(--pr-text-primary)" }}>
                {intercept.agent}
              </p>
              <p style={{ color: "var(--pr-text-secondary)" }}>
                {intercept.action} — {intercept.amount}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getRiskColor(intercept.risk)}15`,
                    color: getRiskColor(intercept.risk),
                  }}
                >
                  {intercept.risk} Risk
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getStatusColor(intercept.status)}15`,
                    color: getStatusColor(intercept.status),
                  }}
                >
                  Status: {intercept.status === "Pending" ? "Pending Approval" : intercept.status}
                </span>
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Authority Evaluation */}
            <section>
              <SectionTitle>Authority Evaluation</SectionTitle>
              <div className="p-4 rounded-xl border space-y-3" style={cardStyle}>
                {[
                  { label: "Authority Result", value: intercept.authorityResult },
                  { label: "Authority Required", value: explanation.authorityRequired },
                  { label: "Authority Present", value: intercept.agent },
                  { label: "Outcome", value: explanation.authorityOutcome },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <span style={{ color: "var(--pr-text-muted)" }}>{row.label}</span>
                    <span
                      className="font-medium text-right"
                      style={{
                        color:
                          row.label === "Outcome"
                            ? getStatusColor(row.value)
                            : "var(--pr-text-primary)",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Policies Evaluated */}
            <section>
              <SectionTitle>Policies Evaluated</SectionTitle>
              <div className="space-y-3">
                {policies.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                    No policies matched — upload governance documents to activate controls.
                  </p>
                ) : (
                  policies.map((policy, index) => (
                    <motion.div
                      key={policy.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl border"
                      style={cardStyle}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--pr-trust-green)" }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
                            {policy.name}
                          </p>
                          <p className="text-xs mb-2" style={{ color: "var(--pr-text-muted)" }}>
                            {policy.reason}
                          </p>
                          <div className="flex items-center gap-3 text-xs">
                            <span style={{ color: "var(--pr-authority-blue)" }}>{policy.result}</span>
                            {policy.confidence != null && (
                              <span style={{ color: "var(--pr-text-disabled)" }}>
                                {policy.confidence}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>

            {/* Decision Reasoning */}
            <section>
              <SectionTitle>Decision Reasoning</SectionTitle>
              <div className="p-4 rounded-xl border" style={cardStyle}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--pr-text-secondary)" }}>
                  {reasoning || "Insufficient data to generate reasoning — run a scenario or upload governance documents."}
                </p>
              </div>
            </section>

            {/* Required Approvals */}
            <section>
              <SectionTitle>Required Approvals</SectionTitle>
              <div className="p-4 rounded-xl border" style={cardStyle}>
                <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
                  Approval Chain
                </p>
                <div className="space-y-1">
                  {approvalChain.map((step, index) => (
                    <div key={`${step.label}-${index}`}>
                      <div className="flex items-center gap-3 py-2">
                        <ChainStepIcon status={step.status} />
                        <span className="text-sm flex-1" style={{ color: "var(--pr-text-primary)" }}>
                          {step.label}
                        </span>
                        <span className="text-xs capitalize" style={{ color: getStatusColor(step.status) }}>
                          {step.status}
                        </span>
                      </div>
                      {index < approvalChain.length - 1 && (
                        <div className="flex justify-start pl-2">
                          <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.15)" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {approval && (
                  <div className="mt-4 pt-3 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--pr-text-muted)" }}>
                    Approval ID: <span className="font-mono" style={{ color: "var(--pr-authority-blue)" }}>{approval.id}</span>
                    {" · "}
                    Status: <span style={{ color: getStatusColor(approval.status) }}>{approval.status}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Evidence Generated */}
            <section>
              <SectionTitle>Evidence Generated</SectionTitle>
              <div className="p-4 rounded-xl border space-y-3" style={cardStyle}>
                {evidenceArtifacts.map((artifact) => (
                  <div key={artifact.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" style={{ color: "var(--pr-evidence-cyan)" }} />
                      <span className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                        {artifact.label}
                      </span>
                    </div>
                    <EvidenceStatusBadge status={artifact.status} />
                  </div>
                ))}
                {evidence && (
                  <Link
                    to="/evidence-vault"
                    className="block mt-3 text-xs font-mono pt-3 border-t transition-opacity hover:opacity-80"
                    style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--pr-evidence-cyan)" }}
                  >
                    View {evidence.id} in Evidence Vault →
                  </Link>
                )}
              </div>
            </section>

            {/* Insurance Impact */}
            <section>
              <SectionTitle>Insurance Impact</SectionTitle>
              <div
                className="p-4 rounded-xl border flex gap-3"
                style={{
                  ...cardStyle,
                  borderColor: "rgba(139,92,246,0.15)",
                  backgroundColor: "rgba(139,92,246,0.04)",
                }}
              >
                <Building2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--pr-verification-purple)" }} />
                <p className="text-sm leading-relaxed" style={{ color: "var(--pr-text-secondary)" }}>
                  {insuranceImpact}
                </p>
              </div>
            </section>

            {/* Decision Timeline */}
            <section>
              <SectionTitle>Decision Timeline</SectionTitle>
              <div className="p-4 rounded-xl border space-y-0" style={cardStyle}>
                {timeline.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex gap-4 py-3 border-b last:border-0"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    <span
                      className="text-xs font-mono flex-shrink-0 w-12 pt-0.5"
                      style={{ color: "var(--pr-text-muted)" }}
                    >
                      {event.time}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: "var(--pr-authority-blue)" }}
                    />
                    <p className="text-sm flex-1" style={{ color: "var(--pr-text-secondary)" }}>
                      {event.message}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          <div
            className="p-4 border-t flex items-center gap-2 text-xs"
            style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--pr-text-disabled)" }}
          >
            <Shield className="w-3.5 h-3.5" />
            <FileText className="w-3.5 h-3.5" />
            <span>Governed decision record · PayReality Authority Layer</span>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
