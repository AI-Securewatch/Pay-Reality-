import { Download, FileText } from "lucide-react";
import { motion } from "motion/react";

const reports = [
  { name: "Monthly Governance Report", date: "June 2026", type: "Executive Summary", size: "2.4 MB" },
  { name: "Compliance Audit Trail", date: "Q2 2026", type: "Compliance", size: "8.7 MB" },
  { name: "Decision Analytics", date: "Last 30 Days", type: "Analytics", size: "1.2 MB" },
  { name: "Insurance Underwriting Package", date: "2026 FY", type: "Insurance", size: "4.8 MB" },
];

export function Reports() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 style={{ color: 'var(--pr-text-primary)' }}>Reports</h1>
            <p style={{ color: 'var(--pr-text-muted)' }}>Generate and download compliance and audit reports</p>
          </div>
          <button
            onClick={() => alert('Generate New Report')}
            className="px-4 py-2 rounded-lg transition-all"
            style={{ 
              backgroundColor: 'var(--pr-authority-blue)',
              color: 'var(--pr-text-primary)',
            }}
          >
            Generate Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report, index) => (
          <motion.div
            key={report.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border flex items-center justify-between"
            style={{ 
              backgroundColor: 'var(--pr-bg-card)', 
              borderColor: 'rgba(255,255,255,0.05)' 
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(77, 124, 254, 0.1)' }}>
                <FileText className="w-6 h-6" style={{ color: 'var(--pr-authority-blue)' }} />
              </div>
              <div>
                <h3 className="mb-1" style={{ color: 'var(--pr-text-primary)' }}>{report.name}</h3>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--pr-text-muted)' }}>
                  <span>{report.date}</span>
                  <span>•</span>
                  <span>{report.type}</span>
                  <span>•</span>
                  <span>{report.size}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => alert(`Download ${report.name}`)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              style={{ 
                backgroundColor: 'rgba(77, 124, 254, 0.1)',
                color: 'var(--pr-authority-blue)',
              }}
            >
              <Download className="w-5 h-5" />
              <span>Download</span>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
