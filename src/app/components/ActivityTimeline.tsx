import { motion } from "motion/react";
import { useDemo } from "../demo/DemoContext";
import type { TimelineEvent } from "../demo/demoTypes";

const typeColors: Record<TimelineEvent["type"], string> = {
  action: "var(--pr-authority-blue)",
  policy: "var(--pr-verification-purple)",
  intercept: "var(--pr-warning-amber)",
  approval: "var(--pr-evidence-cyan)",
  evidence: "var(--pr-trust-green)",
  insurance: "var(--pr-verification-purple)",
  system: "var(--pr-text-muted)",
};

export function ActivityTimeline() {
  const { state } = useDemo();
  const events = state.timeline.slice(0, 12);

  return (
    <div
      className="p-6 rounded-3xl border mb-8"
      style={{
        backgroundColor: "var(--pr-bg-card)",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      <div className="mb-6">
        <h2 className="mb-1" style={{ color: "var(--pr-text-primary)" }}>
          Activity Timeline
        </h2>
        <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
          Enterprise-wide governance activity stream
        </p>
      </div>

      <div className="space-y-3">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-start gap-4 py-2 border-b"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <span
              className="text-xs font-mono flex-shrink-0 w-12 pt-0.5"
              style={{ color: "var(--pr-text-muted)" }}
            >
              {event.time}
            </span>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: typeColors[event.type] }}
            />
            <p className="text-sm flex-1" style={{ color: "var(--pr-text-secondary)" }}>
              {event.message}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
