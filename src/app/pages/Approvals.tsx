import { Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "motion/react";

const pendingApprovals = [
  { id: "APR-2847", agent: "Finance Agent", action: "Wire Transfer", amount: "$250,000", requester: "System", time: "2 min ago" },
  { id: "APR-2846", agent: "Treasury Agent", action: "FX Conversion", amount: "$180,000", requester: "System", time: "15 min ago" },
  { id: "APR-2845", agent: "Procurement Agent", action: "Vendor Onboarding", amount: "$75,000", requester: "System", time: "28 min ago" },
];

export function Approvals() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>Pending Approvals</h1>
        <p style={{ color: 'var(--pr-text-muted)' }}>Review and approve high-risk AI decisions</p>
      </div>

      <div className="space-y-4">
        {pendingApprovals.map((approval, index) => (
          <motion.div
            key={approval.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)' 
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Clock className="w-6 h-6" style={{ color: 'var(--pr-warning-amber)' }} />
                </div>
                <div>
                  <p className="font-mono font-medium mb-1" style={{ color: 'var(--pr-authority-blue)' }}>{approval.id}</p>
                  <p className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>{approval.time}</p>
                </div>
              </div>
              <p className="font-mono" style={{ color: 'var(--pr-text-primary)' }}>{approval.amount}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Agent</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{approval.agent}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Action</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{approval.action}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Requested By</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{approval.requester}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => alert(`Approved ${approval.id}`)}
                className="flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: 'var(--pr-trust-green)',
                }}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => alert(`Rejected ${approval.id}`)}
                className="flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--pr-critical-red)',
                }}
              >
                <XCircle className="w-5 h-5" />
                <span>Reject</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
