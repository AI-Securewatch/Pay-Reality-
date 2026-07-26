import type { PolicyStatus } from "../types";

const STATUS_COLOR: Record<PolicyStatus, string> = {
  draft: "var(--pr-text-disabled)",
  pending_review: "var(--pr-warning-amber)",
  approved: "var(--pr-authority-blue)",
  rejected: "var(--pr-critical-red)",
  compiled: "var(--pr-verification-purple, var(--pr-authority-blue))",
  active: "var(--pr-trust-green)",
  retired: "var(--pr-text-disabled)",
};

// Plain text with a left border in the status color, not a colored
// pill or icon: "enterprise, minimal, GitHub-level clarity, no
// gimmicks" (POLICY_STUDIO_WIREFRAMES.md's UI principles).
export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  return (
    <span
      style={{
        borderLeft: `2px solid ${STATUS_COLOR[status]}`,
        paddingLeft: 8,
        color: "var(--pr-text-primary)",
        fontSize: 13,
        fontFamily: "monospace",
      }}
    >
      {status}
    </span>
  );
}
