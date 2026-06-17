import { Search, Download, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const evidenceRecords = [
  {
    id: "VIC-89273-A2F",
    hash: "7c2b4f3e9d8a1c5b7e3f2a9d8c6b4e1a",
    timestamp: "2026-06-11 14:23:17 UTC",
    agent: "Finance Agent",
    action: "Wire Transfer - $250,000",
    approver: "Sarah Chen (CFO)",
    status: "VERIFIED",
  },
  {
    id: "VIC-89272-B3G",
    hash: "3f9a2b7c8d1e5f4b6c3a9e7d2b1f8c5e",
    timestamp: "2026-06-11 14:18:42 UTC",
    agent: "Procurement Agent",
    action: "Purchase Order - $45,000",
    approver: "System Auto-Approval",
    status: "VERIFIED",
  },
  {
    id: "VIC-89271-C4H",
    hash: "8e7d6c5b4a3f2e1d9c8b7a6f5e4d3c2b",
    timestamp: "2026-06-11 14:12:09 UTC",
    agent: "Treasury Agent",
    action: "Cross-Border Transfer - $1.2M",
    approver: "John Smith (CEO), Sarah Chen (CFO)",
    status: "VERIFIED",
  },
];

export function EvidenceVault() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>Evidence Vault</h1>
        <p style={{ color: 'var(--pr-text-muted)' }}>Cryptographically verified, immutable audit trail of all AI decisions</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--pr-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Evidence ID, Agent, Decision, Date, or Hash..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)',
              color: 'var(--pr-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Evidence Records */}
      <div className="space-y-4">
        {evidenceRecords.map((record, index) => (
          <motion.div
            key={record.id}
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
                  <Shield className="w-6 h-6" style={{ color: 'var(--pr-evidence-cyan)' }} />
                </div>
                <div>
                  <p className="font-mono font-medium mb-1" style={{ color: 'var(--pr-evidence-cyan)' }}>{record.id}</p>
                  <p className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>{record.timestamp}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--pr-trust-green)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--pr-trust-green)' }}>{record.status}</span>
                </div>
                <button
                  onClick={() => alert(`Download ${record.id}`)}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(77, 124, 254, 0.1)',
                    color: 'var(--pr-authority-blue)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Agent Identity</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{record.agent}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Action</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{record.action}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Human Approval</p>
                <p className="font-medium" style={{ color: 'var(--pr-text-primary)' }}>{record.approver}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--pr-text-muted)' }}>Decision Hash</p>
                <p className="font-mono text-sm" style={{ color: 'var(--pr-verification-purple)' }}>{record.hash}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {['VERIFIED', 'IMMUTABLE', 'AUDIT READY'].map((badge) => (
                <span 
                  key={badge}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--pr-verification-purple)',
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
