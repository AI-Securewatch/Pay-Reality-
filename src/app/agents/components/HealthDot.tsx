import type { AgentHealth } from "../types";

const HEALTH_COLOR: Record<AgentHealth, string> = {
  healthy: "var(--pr-trust-green)",
  warning: "var(--pr-warning-amber)",
  offline: "var(--pr-critical-red)",
  unknown: "var(--pr-text-disabled)",
};

const HEALTH_LABEL: Record<AgentHealth, string> = {
  healthy: "Healthy",
  warning: "Warning",
  offline: "Offline",
  unknown: "Not applicable",
};

// Agent Heartbeat (AGENT_LIFECYCLE.md): a small colored dot plus label,
// deliberately distinct from AgentStatusBadge's left-border convention --
// health (is it alive right now) and lifecycle status (what state is it
// in) are different questions and shouldn't look like the same control.
export function HealthDot({ health }: { health: AgentHealth }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--pr-text-muted)" }}>
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: HEALTH_COLOR[health],
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {HEALTH_LABEL[health]}
    </span>
  );
}
