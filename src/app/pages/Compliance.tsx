import { CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

const frameworks = [
  { name: "SOC 2", coverage: 98, effectiveness: 97, violations: 0, status: "Compliant" },
  { name: "ISO 27001", coverage: 96, effectiveness: 95, violations: 0, status: "Compliant" },
  { name: "ISO 42001", coverage: 94, effectiveness: 92, violations: 2, status: "Review Required" },
  { name: "NIST AI RMF", coverage: 99, effectiveness: 98, violations: 0, status: "Compliant" },
  { name: "EU AI Act", coverage: 92, effectiveness: 90, violations: 1, status: "Action Required" },
];

export function Compliance() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>Compliance Center</h1>
        <p style={{ color: 'var(--pr-text-muted)' }}>Monitor compliance across regulatory frameworks</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {frameworks.map((framework, index) => (
          <motion.div
            key={framework.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)' 
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>{framework.name}</h3>
                <div className="flex items-center gap-2">
                  {framework.violations === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--pr-trust-green)' }} />
                      <span className="text-sm" style={{ color: 'var(--pr-trust-green)' }}>{framework.status}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" style={{ color: 'var(--pr-warning-amber)' }} />
                      <span className="text-sm" style={{ color: 'var(--pr-warning-amber)' }}>{framework.status}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>
                {framework.violations} Open Violations
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>Coverage</span>
                  <span className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{framework.coverage}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pr-bg-hover)' }}>
                  <div className="h-full rounded-full" style={{ width: `${framework.coverage}%`, backgroundColor: 'var(--pr-trust-green)' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>Effectiveness</span>
                  <span className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{framework.effectiveness}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pr-bg-hover)' }}>
                  <div className="h-full rounded-full" style={{ width: `${framework.effectiveness}%`, backgroundColor: 'var(--pr-authority-blue)' }} />
                </div>
              </div>
              <div>
                <button
                  onClick={() => alert(`View ${framework.name} details`)}
                  className="w-full px-4 py-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'rgba(77, 124, 254, 0.1)',
                    color: 'var(--pr-authority-blue)',
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
