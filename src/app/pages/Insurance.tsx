import { Building2, TrendingDown, Shield, CheckCircle2, BarChart3, FileCheck, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";

export function Insurance() {
  const { state } = useDemo();
  const ins = state.insurance;

  const supportingMetrics = [
    { label: "Authority Coverage", value: `${ins.authorityCoverage.toFixed(1)}%`, icon: Shield, color: "var(--pr-authority-blue)" },
    { label: "Evidence Integrity", value: `${ins.evidenceIntegrity.toFixed(0)}%`, icon: Lock, color: "var(--pr-evidence-cyan)" },
    { label: "Approval Compliance", value: `${ins.approvalCompliance.toFixed(1)}%`, icon: CheckCircle2, color: "var(--pr-trust-green)" },
    { label: "Policy Enforcement", value: `${ins.policyEnforcement.toFixed(0)}%`, icon: FileCheck, color: "var(--pr-verification-purple)" },
    { label: "Governance Coverage", value: `${ins.governanceCoverage.toFixed(1)}%`, icon: BarChart3, color: "var(--pr-warning-amber)" },
    { label: "Control Effectiveness", value: `${ins.controlEffectiveness.toFixed(0)}%`, icon: TrendingDown, color: "var(--pr-trust-green)" },
  ];

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          Insurance Readiness
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          AI trustworthiness assessment and liability coverage readiness
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-3xl border mb-8 text-center"
        style={{
          backgroundColor: "var(--pr-bg-card)",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <div className="mb-6">
          <div
            className="w-48 h-48 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
              border: "4px solid var(--pr-verification-purple)",
            }}
          >
            <div>
              <motion.p
                key={ins.score}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="mb-2"
                style={{ color: "var(--pr-verification-purple)" }}
              >
                {ins.score}{" "}
                <span className="text-lg" style={{ color: "var(--pr-text-muted)" }}>
                  / 100
                </span>
              </motion.p>
              <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                Insurable AI Score
              </p>
            </div>
          </div>
          <p className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
            {ins.riskLabel}
          </p>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            Score responds to policies, evidence, approvals, and governance coverage
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {supportingMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: "var(--pr-bg-card)",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
              </div>
              <p className="mb-1" style={{ color: metric.color }}>
                {metric.value}
              </p>
              <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                {metric.label}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
