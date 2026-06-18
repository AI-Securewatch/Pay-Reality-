import { Bot, Shield, GitBranch, Clock, CheckCircle2, Building2, FileCode } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useDemo, getDashboardMetrics } from "../demo/DemoContext";
import { DemoControlCenter } from "../components/DemoControlCenter";
import { ActivityTimeline } from "../components/ActivityTimeline";

export function Dashboard() {
  const { state } = useDemo();
  const metrics = getDashboardMetrics(state);
  const [nodes, setNodes] = useState<Array<{ x: number; y: number; type: string; connections: number[] }>>([]);

  const liveMetrics = [
    { label: "Active Agents", value: String(metrics.activeAgents), icon: Bot, color: "var(--pr-authority-blue)" },
    { label: "Active Policies", value: String(metrics.policies), icon: FileCode, color: "var(--pr-evidence-cyan)" },
    { label: "Decision Intercepts", value: String(metrics.intercepts), icon: GitBranch, color: "var(--pr-warning-amber)" },
    { label: "Pending Approvals", value: String(metrics.pendingApprovals), icon: Clock, color: "var(--pr-critical-red)" },
    { label: "Evidence Records", value: String(metrics.evidenceRecords), icon: CheckCircle2, color: "var(--pr-trust-green)" },
    { label: "Governance Coverage", value: metrics.governanceCoverage, icon: Shield, color: "var(--pr-trust-green)" },
    { label: "Insurance Readiness Score", value: `${metrics.insuranceScore}/100`, icon: Building2, color: "var(--pr-verification-purple)" },
  ];

  useEffect(() => {
    const centerX = 400;
    const centerY = 300;
    const radius = 180;

    const nodeTypes = [
      "Organization",
      "AI Agents",
      "Human Approvers",
      "Policies",
      "Systems",
      "Evidence",
      "Insurers",
      "Auditors",
    ];

    const generatedNodes = nodeTypes.map((type, i) => {
      if (i === 0) {
        return { x: centerX, y: centerY, type, connections: [1, 2, 3, 4, 5, 6, 7] };
      }
      const angle = (i - 1) * ((Math.PI * 2) / (nodeTypes.length - 1));
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        type,
        connections: [0],
      };
    });

    setNodes(generatedNodes);
  }, []);

  const maturityLevel = metrics.insuranceScore >= 85 ? 4 : metrics.insuranceScore >= 70 ? 3 : 2;
  const maturityScore = (metrics.insuranceScore / 100 * 5).toFixed(1);

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          Executive Dashboard
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Real-time AI authority governance and compliance monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {liveMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 rounded-3xl border"
              style={{
                backgroundColor: "var(--pr-bg-card)",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(77, 124, 254, 0.1)" }}>
                  <Icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
              </div>
              <div>
                <p className="mb-1" style={{ color: metric.color }}>
                  {metric.value}
                </p>
                <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                  {metric.label}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <DemoControlCenter />
      <ActivityTimeline />

      <div
        className="p-6 rounded-3xl border mb-8"
        style={{
          backgroundColor: "var(--pr-bg-card)",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <div className="mb-6">
          <h2 className="mb-1" style={{ color: "var(--pr-text-primary)" }}>
            AI Authority Ecosystem
          </h2>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            Digital nervous system for AI governance
          </p>
        </div>

        <div className="relative" style={{ height: "600px" }}>
          <svg className="w-full h-full">
            {nodes.map((node, i) =>
              node.connections.map((targetIdx) => (
                <motion.line
                  key={`${i}-${targetIdx}`}
                  x1={node.x}
                  y1={node.y}
                  x2={nodes[targetIdx]?.x || 0}
                  y2={nodes[targetIdx]?.y || 0}
                  stroke="var(--pr-authority-blue)"
                  strokeWidth="2"
                  strokeOpacity="0.2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              ))
            )}

            {nodes.map((node, i) => (
              <motion.g
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={i === 0 ? 50 : 35}
                  fill={i === 0 ? "var(--pr-authority-blue)" : "var(--pr-bg-hover)"}
                  stroke={i === 0 ? "var(--pr-evidence-cyan)" : "var(--pr-authority-blue)"}
                  strokeWidth="2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--pr-text-primary)"
                  fontSize={i === 0 ? "14" : "12"}
                  fontWeight={i === 0 ? "600" : "500"}
                >
                  {node.type}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>
      </div>

      <div
        className="p-6 rounded-3xl border"
        style={{
          backgroundColor: "var(--pr-bg-card)",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <div className="mb-6">
          <h2 className="mb-1" style={{ color: "var(--pr-text-primary)" }}>
            AI Authority Maturity Index
          </h2>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            Organizational governance capability assessment
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="space-y-4">
              {[
                { level: "Level 1", label: "Uncontrolled", value: 20 },
                { level: "Level 2", label: "Observed", value: 40 },
                { level: "Level 3", label: "Governed", value: 60 },
                { level: "Level 4", label: "Accountable", value: 80 },
                { level: "Level 5", label: "Insurable", value: 100 },
              ].map((level, index) => {
                const isActive = index === maturityLevel;
                return (
                  <div key={level.level} className="flex items-center gap-4">
                    <div className="w-24">
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: isActive ? "var(--pr-authority-blue)" : "var(--pr-text-secondary)",
                        }}
                      >
                        {level.level}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-8 rounded-lg overflow-hidden"
                        style={{ backgroundColor: "var(--pr-bg-hover)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: isActive
                              ? `${metrics.insuranceScore}%`
                              : `${level.value}%`,
                          }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                          className="h-full rounded-lg"
                          style={{
                            backgroundColor: isActive
                              ? "var(--pr-authority-blue)"
                              : "rgba(77, 124, 254, 0.3)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-32">
                      <p
                        className="text-sm"
                        style={{
                          color: isActive ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
                        }}
                      >
                        {level.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <div
              className="w-48 h-48 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "radial-gradient(circle, rgba(77, 124, 254, 0.2) 0%, transparent 70%)",
                border: "3px solid var(--pr-authority-blue)",
              }}
            >
              <div>
                <p className="mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                  {maturityScore}
                </p>
                <p className="text-sm" style={{ color: "var(--pr-text-secondary)" }}>
                  Current Level
                </p>
              </div>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
              {metrics.insuranceScore >= 85 ? "Approaching Insurable" : "Highly Accountable"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--pr-text-muted)" }}>
              {state.insurance.riskLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
