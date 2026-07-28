import { useEffect, useState } from "react";
import { Link } from "react-router";
import { policyStudioApi } from "./api";
import type { RuntimePolicy } from "./types";
import { describeApiError } from "../live/format";
import { describePolicy } from "./describePolicy";

export function ReviewQueuePage() {
  const [pending, setPending] = useState<RuntimePolicy[] | null>(null);
  const [approver, setApprover] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    policyStudioApi.list("pending_review").then(setPending);
  }

  useEffect(load, []);

  async function handleApprove(policyKey: string) {
    if (!approver.trim()) {
      setMessage("Enter your name before approving.");
      return;
    }
    try {
      await policyStudioApi.approve(policyKey, approver);
      load();
    } catch (e) {
      setMessage(describeApiError(e, "Approve"));
    }
  }

  async function handleReject(policyKey: string) {
    const reason = rejectReason[policyKey];
    if (!approver.trim() || !reason?.trim()) {
      setMessage("Enter your name and a rejection reason.");
      return;
    }
    try {
      await policyStudioApi.reject(policyKey, approver, reason);
      load();
    } catch (e) {
      setMessage(describeApiError(e, "Reject"));
    }
  }

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Approvals</h1>
      <p style={{ color: "var(--pr-text-muted)", fontSize: 12, marginBottom: 16 }}>
        Enter your name to record who reviewed each rule below.
      </p>

      <label htmlFor="reviewer-name" className="sr-only">Your name</label>
      <input
        id="reviewer-name"
        placeholder="Your name"
        value={approver}
        onChange={(e) => setApprover(e.target.value)}
        style={{
          backgroundColor: "var(--pr-bg-hover)",
          border: "1px solid var(--pr-overlay-10)",
          color: "var(--pr-text-primary)",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 13,
          marginBottom: 16,
          width: 260,
        }}
      />

      {message && (
        <p role="alert" style={{ color: "var(--pr-warning-amber)", marginBottom: 12 }}>{message}</p>
      )}

      {pending?.length === 0 && <p style={{ color: "var(--pr-text-muted)" }}>Nothing pending review.</p>}

      {pending?.map((p) => (
        <div
          key={p.policy_key}
          style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)", borderRadius: 12, padding: 16, marginBottom: 12 }}
        >
          <div className="flex items-center justify-between mb-2">
            <Link to={`/governance/${p.policy_key}`} style={{ color: "var(--pr-authority-blue)" }}>
              {p.name} (v{p.version})
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(p.policy_key)}
                className="rounded-lg border"
                style={{ color: "var(--pr-trust-green)", fontSize: 13, padding: "6px 12px", borderColor: "rgba(34,197,94,0.3)" }}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(p.policy_key)}
                className="rounded-lg border"
                style={{ color: "var(--pr-critical-red)", fontSize: 13, padding: "6px 12px", borderColor: "rgba(239,68,68,0.3)" }}
              >
                Reject
              </button>
            </div>
          </div>
          <p style={{ color: "var(--pr-text-secondary)", fontSize: 13, marginBottom: 10 }}>
            {describePolicy(p)}
            {p.constraints.risk_level && (
              <span style={{ color: "var(--pr-warning-amber)" }}> &middot; {p.constraints.risk_level} risk</span>
            )}
          </p>
          <label htmlFor={`reject-reason-${p.policy_key}`} className="sr-only">Rejection reason</label>
          <input
            id={`reject-reason-${p.policy_key}`}
            placeholder="Reason (required to reject)"
            value={rejectReason[p.policy_key] ?? ""}
            onChange={(e) => setRejectReason((prev) => ({ ...prev, [p.policy_key]: e.target.value }))}
            style={{
              backgroundColor: "var(--pr-bg-hover)",
              border: "1px solid var(--pr-overlay-10)",
              color: "var(--pr-text-primary)",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 13,
              width: "100%",
            }}
          />
        </div>
      ))}
    </div>
  );
}
