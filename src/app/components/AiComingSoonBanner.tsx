export function AiComingSoonBanner() {
  return (
    <div
      role="status"
      style={{
        backgroundColor: "rgba(245,166,35,0.08)",
        border: "1px solid var(--pr-warning-amber)",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 20,
        fontSize: 13,
        color: "var(--pr-text-primary)",
      }}
    >
      <strong>AI-powered extraction: coming soon.</strong>{" "}
      <span style={{ color: "var(--pr-text-muted)" }}>
        What you see below is illustrative sample output that demonstrates the workflow, not a real
        analysis of what you upload. Real LLM-powered extraction is on the way.
      </span>
    </div>
  );
}
