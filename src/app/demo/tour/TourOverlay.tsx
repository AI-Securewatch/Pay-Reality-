import { useEffect, useState } from "react";
import type { TourStep } from "./steps";

interface Props {
  step: TourStep;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}

/** Highlights an existing element in place (a ring + spotlight dim, via a giant box-shadow -- no clip-path needed) and floats a small tooltip beside it. Never blocks clicks on the target itself. */
export function TourOverlay({ step, stepIndex, total, onNext, onPrev, onStop }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(null);
    let cancelled = false;
    let attempts = 0;
    function measure() {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else if (attempts < 20) {
        attempts += 1;
        window.setTimeout(measure, 100);
      }
    }
    measure();
    function onReflow() {
      const el = document.querySelector(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onStop();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStop]);

  const tooltipStyle = rect
    ? {
        top: Math.min(rect.bottom + 12, window.innerHeight - 260),
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
      }
    : { bottom: 24, left: "50%", transform: "translateX(-50%)" };

  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            border: "2px solid var(--pr-authority-blue)",
            borderRadius: 8,
            pointerEvents: "none",
            zIndex: 90,
            boxShadow: "0 0 0 4000px rgba(7,17,31,0.55)",
            transition: "top 200ms ease, left 200ms ease",
          }}
        />
      )}
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: "fixed",
          ...tooltipStyle,
          width: 320,
          zIndex: 91,
          backgroundColor: "var(--pr-bg-card)",
          border: "1px solid var(--pr-overlay-10)",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--pr-authority-blue)" }}>
          Step {stepIndex + 1} of {total}
        </p>
        <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--pr-text-primary)" }}>{step.title}</p>
        <p className="text-sm mb-4" style={{ color: "var(--pr-text-secondary)", lineHeight: 1.5 }}>{step.body}</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onStop} className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
            Skip tour
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: "var(--pr-overlay-06)", color: "var(--pr-text-secondary)" }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            >
              {stepIndex === total - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
