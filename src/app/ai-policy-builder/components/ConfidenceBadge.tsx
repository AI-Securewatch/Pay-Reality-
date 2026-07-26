// A triage aid, not a certainty score (AI_POLICY_BUILDER_ARCHITECTURE.md's
// "Honesty about what confidence means"): the model's own, uncalibrated
// self-report. Never gates promotion; only guides where a reviewer looks
// first.
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.75
      ? "var(--pr-trust-green)"
      : confidence >= 0.5
        ? "var(--pr-warning-amber)"
        : "var(--pr-critical-red)";
  return (
    <span
      style={{
        fontSize: 12,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "1px 8px",
        whiteSpace: "nowrap",
      }}
      title="The model's own self-reported confidence. Review every candidate regardless of this score."
    >
      {pct}% confidence
    </span>
  );
}
