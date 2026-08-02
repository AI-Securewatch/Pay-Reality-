// The ONLY file in this app that imports mixpanel-browser. Every other
// call site imports track()/page()/identify()/reset()/trackError() from
// here, never from "mixpanel-browser" directly -- swapping providers
// later (PostHog, Amplitude, Azure Application Insights) means rewriting
// this one file.
//
// mixpanel-browser is dynamically imported inside initAnalytics(), not
// statically, so it becomes its own lazily-fetched chunk instead of
// bloating the always-loaded entry bundle, and never downloads at all
// when no token is configured.
//
// Silently does nothing if VITE_MIXPANEL_TOKEN is unset, or if running
// on localhost without VITE_MIXPANEL_DEBUG=true -- every exported
// function is always safe to call regardless of whether analytics is
// actually active.
//
// NEVER pass document contents, prompts, governance document text,
// Evidence payloads, secrets, API keys, tokens, passwords, or PII into
// any exported function here. Every call site sticks to a small
// allowlist of IDs and classification fields (agent_id, policy_id,
// decision_id, intent_type, decision_result, time_to_decision, role,
// organization, error_type, component, duration_ms) -- keep new call
// sites to that same shape rather than passing a whole object through.

import { getSessionToken } from "../live/sessionToken";

type Mixpanel = typeof import("mixpanel-browser").default;

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
const DEBUG_LOCAL = import.meta.env.VITE_MIXPANEL_DEBUG === "true";
const ENVIRONMENT = import.meta.env.MODE; // Vite's built-in mode string ("development" | "production")

let mixpanel: Mixpanel | null = null;

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

// ---------------------------------------------------------------------
// Small persisted-counter helpers. localStorage, not sessionStorage --
// journeys, first-seen, and score are meant to survive across visits,
// matching how sessionToken/operatorKey already persist in this app.
// ---------------------------------------------------------------------

function getNumber(key: string): number {
  const raw = localStorage.getItem(key);
  return raw ? Number(raw) || 0 : 0;
}
function setNumber(key: string, value: number): void {
  localStorage.setItem(key, String(value));
}
function getOrSetTimestamp(key: string): number {
  const raw = localStorage.getItem(key);
  if (raw) return Number(raw);
  const now = Date.now();
  localStorage.setItem(key, String(now));
  return now;
}

const KEY = {
  firstSeen: "payreality_analytics_first_seen",
  firstDecisionSeen: "payreality_analytics_first_decision_seen",
  authorityGraphCount: "payreality_analytics_authority_graph_count",
  journeysCompleted: "payreality_analytics_journeys_completed",
  understandingScore: "payreality_analytics_understanding_score",
  highestUnderstandingScore: "payreality_analytics_highest_understanding_score",
  journeyState: "payreality_analytics_journey_state",
};

// ---------------------------------------------------------------------
// Page view -> named event resolution (unchanged from the existing
// implementation; extended nowhere, since every requested page-view
// event already existed).
// ---------------------------------------------------------------------

function resolvePageEvent(pathname: string): string {
  if (pathname === "/") return "Dashboard Viewed";
  if (pathname === "/agents" || pathname.startsWith("/agents/")) return "Agents Viewed";
  if (/^\/governance\/authority-builder\/[^/]+$/.test(pathname)) return "Authority Graph Viewed";
  if (pathname === "/governance") return "Governance Viewed";

  const policyMatch = /^\/governance\/([^/]+)(\/(versions|publish))?$/.exec(pathname);
  if (policyMatch && !["new", "upload", "approvals", "authority-builder"].includes(policyMatch[1])) {
    return "Runtime Policies Viewed";
  }

  if (pathname === "/decisions") return "Runtime Decisions Viewed";
  if (pathname === "/evidence") return "Evidence Viewed";
  if (pathname === "/assurance") return "Assurance Viewed";
  return "Page Viewed";
}

// ---------------------------------------------------------------------
// Acquisition (new): captured exactly once per browser via Mixpanel's
// own register_once(), which is the correct primitive for "first touch,
// never overwritten" -- the previous implementation (removed here)
// re-registered `referrer` on every init, silently losing the true
// original referrer after a visitor's second session.
// ---------------------------------------------------------------------

function captureAcquisitionOnce(): void {
  if (!mixpanel) return;
  const params = new URLSearchParams(window.location.search);
  const props: Record<string, string> = {
    referrer: document.referrer || "direct",
    landing_page: window.location.pathname,
    first_touch_timestamp: new Date().toISOString(),
  };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) props[key] = value;
  }
  mixpanel.register_once(props);
}

// ---------------------------------------------------------------------
// Understanding Score (new): analytics-only, never rendered. Applied
// automatically inside track() so no call site needs to know it exists.
// understanding_score is the cumulative total; highest_understanding_score
// tracks the same value as a high-water mark, so a future change that
// introduces decay or a per-session reset doesn't need a second
// migration -- the two are only equal today because nothing subtracts.
// ---------------------------------------------------------------------

const UNDERSTANDING_POINTS: Record<string, number> = {
  "Platform Opened": 15,
  "Authority Graph Viewed": 20,
  "Runtime Policy Generated": 25,
  "Runtime Intent Submitted": 35,
  "Runtime Decision Produced": 45,
  "Evidence Viewed": 60,
  "Runtime Authority Journey Completed": 100,
};

function applyUnderstandingScore(event: string): void {
  const points = UNDERSTANDING_POINTS[event];
  if (points === undefined || !mixpanel) return;
  const score = getNumber(KEY.understandingScore) + points;
  const highest = Math.max(score, getNumber(KEY.highestUnderstandingScore));
  setNumber(KEY.understandingScore, score);
  setNumber(KEY.highestUnderstandingScore, highest);
  mixpanel.people.set({ understanding_score: score, highest_understanding_score: highest });
}

// ---------------------------------------------------------------------
// Runtime Authority Journey (new, the North Star event). Tracks
// progress through the five ordered steps below; an event that arrives
// out of order (e.g. Evidence Viewed before Runtime Intent Submitted)
// is simply ignored for journey purposes -- it neither advances nor
// resets progress, so a visitor who wanders off-path and back doesn't
// lose credit for steps already completed in order.
// ---------------------------------------------------------------------

const JOURNEY_STEPS = [
  "Authority Graph Viewed",
  "Runtime Policy Generated",
  "Runtime Intent Submitted",
  "Runtime Decision Produced",
  "Evidence Viewed",
] as const;

interface JourneyState {
  step: number;
  startedAt: number | null;
  decisionResult: unknown;
  intentType: unknown;
}

function getJourneyState(): JourneyState {
  const raw = localStorage.getItem(KEY.journeyState);
  if (!raw) return { step: 0, startedAt: null, decisionResult: null, intentType: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { step: 0, startedAt: null, decisionResult: null, intentType: null };
  }
}
function setJourneyState(state: JourneyState): void {
  localStorage.setItem(KEY.journeyState, JSON.stringify(state));
}

function isDemoSession(): boolean {
  // No formal Demo Mode exists in this codebase today (the earlier
  // Demo Workspace design was deliberately not built -- see this
  // session's own history). The closest honest proxy available is
  // "no authenticated session": identify() below sets this flag
  // explicitly on both the real-login and anonymous-visitor paths,
  // so this reads that already-identified value back rather than
  // guessing again here.
  return localStorage.getItem("payreality_analytics_is_demo") === "true";
}

function advanceJourney(event: string, properties?: Record<string, unknown>): void {
  const idx = JOURNEY_STEPS.indexOf(event as (typeof JOURNEY_STEPS)[number]);
  if (idx === -1) return;

  const state = getJourneyState();
  if (idx !== state.step) return; // not the next expected step -- ignore, don't reset

  const now = Date.now();
  const startedAt = state.step === 0 ? now : state.startedAt;
  const next: JourneyState = {
    step: state.step + 1,
    startedAt,
    decisionResult: event === "Runtime Decision Produced" ? properties?.decision_result ?? null : state.decisionResult,
    intentType: event === "Runtime Decision Produced" ? properties?.intent_type ?? null : state.intentType,
  };

  if (next.step === JOURNEY_STEPS.length) {
    const completedCount = getNumber(KEY.journeysCompleted) + 1;
    setNumber(KEY.journeysCompleted, completedCount);
    track("Runtime Authority Journey Completed", {
      journey_duration_seconds: Math.round((now - (startedAt ?? now)) / 1000),
      decision_outcome: next.decisionResult,
      intent_type: next.intentType,
      is_first_completion: completedCount === 1,
      completed_in_demo_mode: isDemoSession(),
    });
    setJourneyState({ step: 0, startedAt: null, decisionResult: null, intentType: null }); // ready for the next completion
  } else {
    setJourneyState(next);
  }
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!TOKEN) return;
  if (isLocalhost() && !DEBUG_LOCAL) return;

  const { default: mp } = await import("mixpanel-browser");
  mp.init(TOKEN, {
    autocapture: false, // this file decides what gets tracked, not Mixpanel's autocapture heuristics
    persistence: "localStorage",
  });
  mixpanel = mp;

  mixpanel.register({ application: "platform", environment: ENVIRONMENT });
  captureAcquisitionOnce();
  track("Platform Opened", { page: window.location.pathname });

  // Anonymous/guest visitor: identify now, synchronously within this same
  // function, rather than from AuthContext's mount effect -- React fires
  // child effects (AuthProvider's) before parent effects (this one,
  // owned by App.tsx) on initial mount, so a same-tick anonymous
  // identify() call from AuthContext would run before `mixpanel` above is
  // even assigned and silently no-op. A real login or restored session
  // still identifies from AuthContext.tsx as before, since those paths
  // wait on a network round-trip first and are safely past this point by
  // the time they resolve.
  if (!getSessionToken()) identify(null);
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!mixpanel) return;

  // Merged into this same call's properties, never a second track() for
  // the same event -- firing "Runtime Decision Produced" twice would be
  // exactly the duplicate instrumentation this task was told to avoid.
  let finalProperties = properties;
  if (event === "Runtime Decision Produced" && !localStorage.getItem(KEY.firstDecisionSeen)) {
    localStorage.setItem(KEY.firstDecisionSeen, "true");
    const firstSeen = getNumber(KEY.firstSeen) || getOrSetTimestamp(KEY.firstSeen);
    finalProperties = {
      ...properties,
      time_to_first_decision_seconds: Math.round((Date.now() - firstSeen) / 1000),
    };
  }

  mixpanel.track(event, finalProperties);
  applyUnderstandingScore(event);
  advanceJourney(event, properties);

  if (event === "Authority Graph Generated") {
    const count = getNumber(KEY.authorityGraphCount) + 1;
    setNumber(KEY.authorityGraphCount, count);
    mixpanel.people.set({ authority_graph_count: count });
  }
}

// Dedicated error/failure tracker -- same allowlist discipline as
// track(), never a stack trace, prompt, document, or payload. Callers
// pass exactly: error_type (a short classification string, not a raw
// error message), component, and optionally duration_ms/retry_attempt.
export function trackError(
  event:
    | "Authority Graph Generation Failed"
    | "Runtime Policy Generation Failed"
    | "Runtime Intent Submission Failed"
    | "Runtime Decision Failed"
    | "Evidence Generation Failed",
  details: { error_type: string; component: string; duration_ms?: number; retry_attempt?: number }
): void {
  track(event, details);
}

// Called on every route change (see Layout.tsx's analytics effect).
export function page(pathname: string): void {
  track(resolvePageEvent(pathname), { page: pathname });
}

// Called on real login, on session-restore, AND once at boot for an
// anonymous visitor with no session (see AuthContext.tsx and
// initAnalytics()'s caller in App.tsx) -- "whenever a user signs in (or
// enters Demo Mode), identify them" is satisfied by making this the one
// function both paths call, rather than inventing a separate Demo Mode
// identity path that doesn't correspond to anything real in this
// codebase today.
export function identify(user?: { id: string; role: string; organization_id: string } | null): void {
  if (!mixpanel) return;
  const firstSeen = getOrSetTimestamp(KEY.firstSeen);
  const isDemo = !user;
  localStorage.setItem("payreality_analytics_is_demo", String(isDemo));

  if (user) mixpanel.identify(user.id);

  const journeyStep = getJourneyState().step;
  const journeyStage = journeyStep === 0 ? "not_started" : JOURNEY_STEPS[journeyStep - 1];

  mixpanel.people.set({
    role: user?.role ?? null,
    organization: user?.organization_id ?? null,
    environment: ENVIRONMENT,
    is_demo: isDemo,
    signup_source: mixpanel.get_property("utm_source") ?? "direct",
    journey_stage: journeyStage,
    runtime_journeys_completed: getNumber(KEY.journeysCompleted),
    authority_graph_count: getNumber(KEY.authorityGraphCount),
    first_seen: new Date(firstSeen).toISOString(),
    last_seen: new Date().toISOString(),
  });
  mixpanel.register({ role: user?.role ?? null, organization: user?.organization_id ?? null, is_demo: isDemo });
}

// Called on logout (see AuthContext.tsx). Tracks Session Ended first,
// while the session is still attributed to the identified user, then
// clears Mixpanel's local identity so the next login on this browser
// doesn't inherit the previous user's distinct_id.
export function reset(): void {
  if (!mixpanel) return;
  track("Session Ended");
  mixpanel.reset();
}
