import { Play, RotateCcw, Building2, Truck, Users, Landmark } from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import { useNotify } from "./NotificationProvider";
import type { ScenarioType } from "../demo/demoScenarios";

const scenarios: { id: ScenarioType; label: string; desc: string; icon: typeof Landmark }[] = [
  {
    id: "treasury",
    label: "Run Treasury Scenario",
    desc: "Wire transfer $250K — CFO approval required",
    icon: Landmark,
  },
  {
    id: "vendor",
    label: "Run Vendor Scenario",
    desc: "Vendor onboarding — missing KYC",
    icon: Truck,
  },
  {
    id: "payroll",
    label: "Run Payroll Scenario",
    desc: "Salary +18% — manager approval required",
    icon: Users,
  },
  {
    id: "enterprise",
    label: "Run Enterprise Scenario",
    desc: "Execute all governance workflows",
    icon: Building2,
  },
];

export function DemoControlCenter() {
  const { runScenario, resetDemo, scenarioRunning } = useDemo();
  const notify = useNotify();

  const handleRun = async (id: ScenarioType) => {
    notify.info(`Starting ${id} scenario...`);
    await runScenario(id);
    notify.success(`${id.charAt(0).toUpperCase() + id.slice(1)} scenario complete`);
  };

  const handleReset = () => {
    resetDemo();
    notify.warning("Demo environment reset to initial state");
  };

  return (
    <div
      className="p-6 rounded-3xl border mb-8"
      style={{
        backgroundColor: "var(--pr-bg-card)",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      <div className="mb-6">
        <h2 className="mb-1" style={{ color: "var(--pr-text-primary)" }}>
          Demo Control Center
        </h2>
        <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
          Execute enterprise governance scenarios across the platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {scenarios.map((s, index) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.id}
              type="button"
              disabled={scenarioRunning}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleRun(s.id)}
              className="p-4 rounded-2xl border text-left transition-all disabled:opacity-50"
              style={{
                backgroundColor: "rgba(77,124,254,0.06)",
                borderColor: "rgba(77,124,254,0.2)",
              }}
              onMouseEnter={(e) => {
                if (!scenarioRunning) e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(77,124,254,0.06)";
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4" style={{ color: "var(--pr-authority-blue)" }} />
                <Icon className="w-4 h-4" style={{ color: "var(--pr-evidence-cyan)" }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
                {s.label}
              </p>
              <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                {s.desc}
              </p>
            </motion.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={scenarioRunning}
        className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 border transition-all disabled:opacity-50"
        style={{
          borderColor: "rgba(239,68,68,0.3)",
          color: "var(--pr-critical-red)",
          backgroundColor: "rgba(239,68,68,0.08)",
        }}
      >
        <RotateCcw className="w-4 h-4" />
        Reset Environment
      </button>
    </div>
  );
}
