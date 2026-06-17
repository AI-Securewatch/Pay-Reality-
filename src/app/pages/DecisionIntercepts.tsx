import { useState } from "react";
import { motion } from "motion/react";
import { Clock, DollarSign, AlertTriangle, CheckCircle2, XCircle, Eye } from "lucide-react";

const decisions = [
  {
    id: "DEC-2892",
    timestamp: "2 min ago",
    agent: "Finance Agent",
    action: "Wire Transfer",
    amount: "$250,000",
    risk: "Critical",
    policy: "Approval Required",
    approver: "CFO",
    outcome: "Pending",
    evidence: "Generated",
  },
  {
    id: "DEC-2891",
    timestamp: "5 min ago",
    agent: "Procurement Agent",
    action: "Purchase Order",
    amount: "$45,000",
    risk: "Medium",
    policy: "Auto-Approved",
    approver: "System",
    outcome: "Approved",
    evidence: "Generated",
  },
  {
    id: "DEC-2890",
    timestamp: "8 min ago",
    agent: "Treasury Agent",
    action: "Cross-Border Transfer",
    amount: "$1,200,000",
    risk: "Critical",
    policy: "Dual Approval",
    approver: "CFO, CEO",
    outcome: "Approved",
    evidence: "Generated",
  },
  {
    id: "DEC-2889",
    timestamp: "12 min ago",
    agent: "Vendor Approval Agent",
    action: "Vendor Payment",
    amount: "$89,500",
    risk: "High",
    policy: "Approval Required",
    approver: "Finance Director",
    outcome: "Blocked",
    evidence: "Generated",
  },
  {
    id: "DEC-2888",
    timestamp: "15 min ago",
    agent: "Customer Support Agent",
    action: "Refund",
    amount: "$2,500",
    risk: "Low",
    policy: "Auto-Approved",
    approver: "System",
    outcome: "Approved",
    evidence: "Generated",
  },
];

const getOutcomeColor = (outcome: string) => {
  switch (outcome.toLowerCase()) {
    case 'approved': return 'var(--pr-trust-green)';
    case 'pending': return 'var(--pr-warning-amber)';
    case 'blocked': return 'var(--pr-critical-red)';
    default: return 'var(--pr-text-muted)';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'critical': return 'var(--pr-critical-red)';
    case 'high': return 'var(--pr-warning-amber)';
    case 'medium': return 'var(--pr-evidence-cyan)';
    case 'low': return 'var(--pr-trust-green)';
    default: return 'var(--pr-text-muted)';
  }
};

export function DecisionIntercepts() {
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>Decision Intercept Center</h1>
        <p style={{ color: 'var(--pr-text-muted)' }}>Real-time stream of AI decision evaluation and enforcement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Today", value: "8,247", color: 'var(--pr-authority-blue)' },
          { label: "Auto-Approved", value: "7,583", color: 'var(--pr-trust-green)' },
          { label: "Pending Review", value: "482", color: 'var(--pr-warning-amber)' },
          { label: "Blocked", value: "182", color: 'var(--pr-critical-red)' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)' 
            }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>{stat.label}</p>
            <p className="mb-0" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Decision Stream */}
      <div className="space-y-4">
        {decisions.map((decision, index) => (
          <motion.div
            key={decision.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border cursor-pointer transition-all"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: expandedDecision === decision.id ? 'var(--pr-authority-blue)' : 'rgba(255,255,255,0.05)' 
            }}
            onClick={() => setExpandedDecision(expandedDecision === decision.id ? null : decision.id)}
          >
            <div className="flex items-start gap-6">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getOutcomeColor(decision.outcome)}15` }}>
                  {decision.outcome === 'Approved' && <CheckCircle2 className="w-6 h-6" style={{ color: getOutcomeColor(decision.outcome) }} />}
                  {decision.outcome === 'Pending' && <Clock className="w-6 h-6" style={{ color: getOutcomeColor(decision.outcome) }} />}
                  {decision.outcome === 'Blocked' && <XCircle className="w-6 h-6" style={{ color: getOutcomeColor(decision.outcome) }} />}
                </div>
                {index < decisions.length - 1 && (
                  <div className="w-0.5 h-16 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                )}
              </div>

              {/* Decision details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-medium" style={{ color: 'var(--pr-authority-blue)' }}>{decision.id}</span>
                      <span className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>{decision.timestamp}</span>
                    </div>
                    <h3 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>{decision.agent}</h3>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 font-mono" style={{ color: 'var(--pr-text-primary)' }}>{decision.amount}</p>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getRiskColor(decision.risk)}15`,
                        color: getRiskColor(decision.risk),
                      }}
                    >
                      {decision.risk} Risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Requested Action</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--pr-text-primary)' }}>{decision.action}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Policy Result</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--pr-text-primary)' }}>{decision.policy}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Approver</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--pr-text-primary)' }}>{decision.approver}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Evidence</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--pr-trust-green)' }}>{decision.evidence}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-4 py-1.5 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: `${getOutcomeColor(decision.outcome)}15`,
                        color: getOutcomeColor(decision.outcome),
                      }}
                    >
                      {decision.outcome}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`View details for ${decision.id}`);
                    }}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                    style={{ 
                      backgroundColor: 'rgba(77, 124, 254, 0.1)',
                      color: 'var(--pr-authority-blue)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(77, 124, 254, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(77, 124, 254, 0.1)';
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">View Evidence</span>
                  </button>
                </div>

                {/* Expanded view */}
                {expandedDecision === decision.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 pt-6 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      {/* Left column */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Authority Verification</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--pr-trust-green)' }} />
                            <span className="text-sm" style={{ color: 'var(--pr-trust-green)' }}>Verified — {decision.agent} has delegated authority</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Policy Evaluation</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--pr-text-primary)' }}>
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--pr-authority-blue)' }} />
                              High-Value Payment Control — Triggered
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--pr-text-secondary)' }}>
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--pr-text-muted)' }} />
                              Vendor Whitelist Check — Passed
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Risk Analysis</p>
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getRiskColor(decision.risk)}15`, color: getRiskColor(decision.risk) }}>
                              {decision.risk} Risk
                            </span>
                            <span className="text-sm font-mono" style={{ color: 'var(--pr-text-secondary)' }}>Score: 9.2 / 10</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Approval Chain</p>
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--pr-text-primary)' }}>
                            <span>{decision.approver}</span>
                            <span style={{ color: 'var(--pr-text-muted)' }}>→</span>
                            <span style={{ color: 'var(--pr-warning-amber)' }}>{decision.outcome}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right column */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Evidence Generated</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--pr-trust-green)' }} />
                            <span className="text-sm font-mono" style={{ color: 'var(--pr-evidence-cyan)' }}>VIC-{decision.id.replace('DEC-', '')}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Cryptographic Verification</p>
                          <p className="font-mono text-xs break-all" style={{ color: 'var(--pr-verification-purple)' }}>
                            Ed25519:a3f9c2b8d7e6f5a4c3b2a1d9e8f7c6b5a4d3c2b1a9e8d7c6f5b4a3d2c1b0a9f8e7
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--pr-text-muted)' }}>Final Outcome</p>
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                            style={{ backgroundColor: `${getOutcomeColor(decision.outcome)}15`, color: getOutcomeColor(decision.outcome) }}
                          >
                            {decision.outcome === 'Approved' && <CheckCircle2 className="w-4 h-4" />}
                            {decision.outcome === 'Pending' && <Clock className="w-4 h-4" />}
                            {decision.outcome === 'Blocked' && <XCircle className="w-4 h-4" />}
                            {decision.outcome}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
