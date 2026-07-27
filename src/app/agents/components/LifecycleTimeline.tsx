import { formatStatus } from "../../live/format";
import type { AuditEvent } from "../types";

const EVENT_LABEL: Record<string, string> = {
  agent_created: "Created",
  agent_activated: "Activated",
  agent_suspended: "Suspended",
  agent_reactivated: "Reactivated",
  agent_revoked: "Revoked",
  agent_retired: "Retired",
  certificate_rotated: "Certificate rotated",
  certificate_rotation_requested: "Certificate rotation requested",
  owner_changed: "Owner changed",
};

const EVENT_COLOR: Record<string, string> = {
  agent_created: "var(--pr-authority-blue)",
  agent_activated: "var(--pr-trust-green)",
  agent_suspended: "var(--pr-warning-amber)",
  agent_reactivated: "var(--pr-trust-green)",
  agent_revoked: "var(--pr-critical-red)",
  agent_retired: "var(--pr-text-disabled)",
  certificate_rotated: "var(--pr-evidence-cyan, var(--pr-authority-blue))",
  certificate_rotation_requested: "var(--pr-warning-amber)",
  owner_changed: "var(--pr-verification-purple, var(--pr-authority-blue))",
};

function describe(event: AuditEvent): string | null {
  const d = event.payload?.details as Record<string, unknown> | undefined;
  if (!d) return null;
  if (event.event_type === "agent_suspended" || event.event_type === "agent_retired" || event.event_type === "agent_revoked") {
    return d.reason ? String(d.reason) : null;
  }
  if (event.event_type === "owner_changed") {
    return `${d.from_owner ?? "none"} → ${d.to_owner ?? "none"}`;
  }
  return null;
}

// Every lifecycle event is signed (agent_service._append_audit_event);
// this renders the timeline itself, not the raw signature -- see the
// Agent Detail page's audit section for the verify action.
export function LifecycleTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>No lifecycle events yet.</p>;
  }

  return (
    <div>
      {events.map((event, i) => {
        const color = EVENT_COLOR[event.event_type] ?? "var(--pr-text-muted)";
        const detail = describe(event);
        return (
          <div key={event.id} className="flex gap-3" style={{ paddingBottom: i === events.length - 1 ? 0 : 18, position: "relative" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 10, height: 10, borderRadius: "50%", backgroundColor: color,
                  marginTop: 4, position: "relative", zIndex: 1,
                }}
              />
              {i !== events.length - 1 && (
                <div
                  style={{
                    position: "absolute", left: 4, top: 14, bottom: -18, width: 1,
                    backgroundColor: "var(--pr-overlay-12)",
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pr-text-primary)" }}>
                {EVENT_LABEL[event.event_type] ?? formatStatus(event.event_type)}
              </div>
              {detail && (
                <div style={{ fontSize: 12, color: "var(--pr-text-muted)", marginTop: 2 }}>{detail}</div>
              )}
              <div style={{ fontSize: 11, color: "var(--pr-text-disabled)", marginTop: 2, fontFamily: "monospace" }}>
                {new Date(event.created_at).toLocaleString()} &middot; {event.actor ?? "operator"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
