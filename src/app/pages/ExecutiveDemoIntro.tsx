import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, ChevronsDown, Fingerprint, ScanEye, FileCheck2 } from "lucide-react";

/**
 * Temporary executive demo layer for the Overview page
 * (see PlatformOverview.tsx). Deliberately fixed-dark regardless of the
 * app's own light/dark toggle -- this is a scripted cinematic moment for
 * live presentation, not a page meant to reflect the viewer's theme
 * preference. Self-contained so it can be deleted as a single file/import
 * once it's no longer needed.
 */

const DARK_BG = "#07111F";
const DARK_TEXT_PRIMARY = "#F8FAFC";
const DARK_TEXT_SECONDARY = "#CBD5E1";
const DARK_TEXT_MUTED = "#94A3B8";
const DARK_CARD_BG = "#111C31";
const ACCENT_BLUE = "#4D7CFE";
const ACCENT_GREEN = "#22C55E";
const ACCENT_AMBER = "#F59E0B";

function useReveal<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 700ms ease ${delayMs}ms, transform 700ms ease ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

const EVOLUTION = ["Humans", "Applications", "AI Assistants", "AI Agents", "Autonomous AI"];

const AI_CAPABILITIES = [
  "Approve payments",
  "Execute workflows",
  "Communicate with customers",
  "Trigger business actions",
];

const CAPABILITY_CARDS = [
  {
    icon: Fingerprint,
    title: "AI Agent Identity",
    desc: "Every AI agent receives a verified identity, ownership, and delegated authority scope.",
  },
  {
    icon: ScanEye,
    title: "Runtime Decision Engine",
    desc: "Every high-impact action is evaluated against enterprise authority policies before execution.",
  },
  {
    icon: FileCheck2,
    title: "Cryptographic Evidence",
    desc: "Every decision generates verifiable evidence for governance, audit, risk, and compliance.",
  },
];

function scrollToDashboard() {
  document.getElementById("pr-dashboard")?.scrollIntoView({ behavior: "smooth" });
}

export function ExecutiveDemoIntro() {
  return (
    <div style={{ backgroundColor: DARK_BG }}>
      {/* Scene 1 */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <Reveal>
          <p
            className="text-xs font-mono uppercase tracking-[0.3em] mb-6"
            style={{ color: DARK_TEXT_MUTED }}
          >
            Executive Briefing
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold max-w-4xl leading-tight"
            style={{ color: DARK_TEXT_PRIMARY }}
          >
            The Enterprise Has a New Employee.
          </h2>
        </Reveal>
        <Reveal delayMs={900} className="absolute bottom-10">
          <ChevronsDown className="w-5 h-5 animate-bounce" style={{ color: DARK_TEXT_MUTED }} />
        </Reveal>
      </section>

      {/* Scene 2 */}
      <section className="min-h-screen flex items-center justify-center px-6 text-center">
        <Reveal>
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold" style={{ color: ACCENT_BLUE }}>
            It Isn't Human.
          </h2>
        </Reveal>
      </section>

      {/* Scene 3: the evolution */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <Reveal className="mb-12">
          <p className="text-xs font-mono uppercase tracking-[0.3em]" style={{ color: DARK_TEXT_MUTED }}>
            The Evolution
          </p>
        </Reveal>
        <div className="flex flex-col items-center gap-3">
          {EVOLUTION.map((label, i) => {
            const isLast = i === EVOLUTION.length - 1;
            return (
              <div key={label} className="flex flex-col items-center gap-3">
                <Reveal delayMs={i * 160}>
                  <div
                    className="px-7 py-3.5 rounded-full border text-lg sm:text-xl font-medium"
                    style={
                      isLast
                        ? { borderColor: ACCENT_BLUE, backgroundColor: "rgba(77,124,254,0.14)", color: ACCENT_BLUE }
                        : { borderColor: "rgba(255,255,255,0.12)", color: DARK_TEXT_SECONDARY }
                    }
                  >
                    {label}
                  </div>
                </Reveal>
                {!isLast && (
                  <Reveal delayMs={i * 160 + 80}>
                    <ChevronDown className="w-5 h-5" style={{ color: "#64748B" }} />
                  </Reveal>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Scene 4: what AI can now do */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <Reveal className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: DARK_TEXT_PRIMARY }}>
            AI can now:
          </h2>
        </Reveal>
        <div className="flex flex-col gap-4 w-full max-w-md">
          {AI_CAPABILITIES.map((c, i) => (
            <Reveal key={c} delayMs={i * 150}>
              <div
                className="flex items-center gap-3 px-5 py-3.5 rounded-xl border"
                style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: DARK_CARD_BG }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: ACCENT_GREEN }} />
                </div>
                <span className="text-base sm:text-lg" style={{ color: DARK_TEXT_PRIMARY }}>
                  {c}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Scene 5: the core question -- the strongest visual moment */}
      <section className="min-h-screen flex items-center justify-center px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(77,124,254,0.18), transparent 60%)" }}
        />
        <Reveal className="relative max-w-4xl">
          <p
            className="text-xs font-mono uppercase tracking-[0.3em] mb-8"
            style={{ color: ACCENT_BLUE }}
          >
            The Question Every Enterprise Must Answer
          </p>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
            style={{ color: DARK_TEXT_PRIMARY }}
          >
            Should this AI be allowed
            <br />
            to perform this action?
          </h2>
        </Reveal>
      </section>

      {/* The reveal */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-7">
        <Reveal>
          <p className="text-2xl sm:text-3xl" style={{ color: DARK_TEXT_SECONDARY }}>
            Identity tells us who the AI is.
          </p>
        </Reveal>
        <Reveal delayMs={500}>
          <p className="text-2xl sm:text-3xl font-medium max-w-2xl" style={{ color: DARK_TEXT_PRIMARY }}>
            Runtime Authority determines whether it is authorised to act.
          </p>
        </Reveal>
        <Reveal delayMs={1100} className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="/payreality-logo.png" alt="" className="w-10 h-10 rounded-xl" />
            <span className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: DARK_TEXT_PRIMARY }}>
              Pay<span style={{ color: ACCENT_AMBER }}>Reality</span>
            </span>
          </div>
          <p
            className="text-sm sm:text-base font-mono uppercase tracking-[0.25em]"
            style={{ color: ACCENT_BLUE }}
          >
            Runtime Authority for Enterprise AI
          </p>
        </Reveal>
      </section>

      {/* Product connection */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
        <Reveal className="mb-12 text-center max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT_BLUE }}>
            How PayReality Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ color: DARK_TEXT_PRIMARY }}>
            Three capabilities. One runtime.
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3 max-w-5xl w-full">
          {CAPABILITY_CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delayMs={i * 150}>
                <div
                  className="h-full p-6 rounded-2xl border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: DARK_CARD_BG }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(77,124,254,0.14)", border: "1px solid rgba(77,124,254,0.3)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: ACCENT_BLUE }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: DARK_TEXT_PRIMARY }}>
                    {c.title}
                  </h3>
                  <p className="text-sm" style={{ color: DARK_TEXT_MUTED }}>
                    {c.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delayMs={450} className="mt-14">
          <button
            type="button"
            onClick={scrollToDashboard}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT_BLUE, color: "#fff" }}
          >
            Start Executive Demo
            <ArrowRight className="w-4 h-4" />
          </button>
        </Reveal>
      </section>
    </div>
  );
}
