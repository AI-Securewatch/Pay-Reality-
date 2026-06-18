import { Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import { useNotify } from "../components/NotificationProvider";

export function Approvals() {
  const { state, approve, reject } = useDemo();
  const notify = useNotify();
  const pendingApprovals = state.approvals.filter((a) => a.status === "pending");
  const completedApprovals = state.approvals.filter((a) => a.status !== "pending");

  const handleApprove = (id: string) => {
    approve(id);
    notify.success(`Approval ${id} granted — evidence and insurance metrics updated`);
  };

  const handleReject = (id: string) => {
    reject(id);
    notify.warning(`Approval ${id} rejected — action blocked`);
  };

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>
          Pending Approvals
        </h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Review and approve high-risk AI decisions
        </p>
      </div>

      {pendingApprovals.length === 0 ? (
        <div
          className="p-8 rounded-2xl border text-center"
          style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--pr-trust-green)" }} />
          <p style={{ color: "var(--pr-text-primary)" }}>No pending approvals</p>
          <p className="text-sm mt-1" style={{ color: "var(--pr-text-muted)" }}>
            Run a demo scenario from the Dashboard to generate approval requests
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval, index) => (
            <motion.div
              key={approval.id}
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
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
                  >
                    <Clock className="w-6 h-6" style={{ color: "var(--pr-warning-amber)" }} />
                  </div>
                  <div>
                    <p className="font-mono font-medium mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                      {approval.id}
                    </p>
                    <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                      {approval.time} · Requires {approval.approverRole}
                    </p>
                  </div>
                </div>
                <p className="font-mono" style={{ color: "var(--pr-text-primary)" }}>
                  {approval.amount}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                    Agent
                  </p>
                  <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                    {approval.agent}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                    Action
                  </p>
                  <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                    {approval.action}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--pr-text-muted)" }}>
                    Requested By
                  </p>
                  <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                    {approval.requester}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(approval.id)}
                  className="flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.1)",
                    color: "var(--pr-trust-green)",
                  }}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(approval.id)}
                  className="flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "var(--pr-critical-red)",
                  }}
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {completedApprovals.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg" style={{ color: "var(--pr-text-primary)" }}>
            Completed Approvals
          </h2>
          <div className="space-y-3">
            {completedApprovals.slice(0, 5).map((approval) => (
              <div
                key={approval.id}
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{
                  backgroundColor: "var(--pr-bg-card)",
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <div>
                  <p className="font-mono text-sm" style={{ color: "var(--pr-authority-blue)" }}>
                    {approval.id}
                  </p>
                  <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                    {approval.agent} — {approval.action}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    backgroundColor:
                      approval.status === "approved"
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
                    color:
                      approval.status === "approved"
                        ? "var(--pr-trust-green)"
                        : "var(--pr-critical-red)",
                  }}
                >
                  {approval.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
