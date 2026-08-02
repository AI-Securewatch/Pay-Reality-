// The ONLY file in this app that imports mixpanel-browser. Every other
// call site imports track()/page()/identify()/reset() from here, never
// from "mixpanel-browser" directly -- swapping providers later (PostHog,
// Amplitude, Azure Application Insights) means rewriting this one file.
//
// mixpanel-browser is dynamically imported inside initAnalytics(), not
// statically, so it becomes its own lazily-fetched chunk instead of
// bloating the always-loaded entry bundle, and never downloads at all
// when no token is configured (see the equivalent design in the
// marketing website repo's src/app/services/analytics.ts).
//
// Silently does nothing if VITE_MIXPANEL_TOKEN is unset, or if running
// on localhost without VITE_MIXPANEL_DEBUG=true -- every exported
// function is always safe to call regardless of whether analytics is
// actually active.
//
// NEVER pass document contents, prompts, governance document text,
// Evidence payloads, secrets, API keys, or PII into track()/identify().
// Every call site in this codebase sticks to a small allowlist of IDs and
// classification fields (agent_id, policy_id, decision_id, intent_type,
// decision_result, time_to_decision, role, organization) -- keep new call
// sites to that same shape rather than passing a whole object through.

type Mixpanel = typeof import("mixpanel-browser").default;

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
const DEBUG_LOCAL = import.meta.env.VITE_MIXPANEL_DEBUG === "true";
const ENVIRONMENT = import.meta.env.MODE; // Vite's built-in mode string ("development" | "production")

let mixpanel: Mixpanel | null = null;

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

// Resolves a pathname to the specific named "* Viewed" event this was
// scoped to; unlisted routes (Organisation Settings, Users, login,
// governance/new, governance/upload, governance/approvals) still get a
// generic "Page Viewed" via the "Automatically track page navigation"
// requirement, rather than nothing.
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
  track("Platform Opened", { page: window.location.pathname });
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!mixpanel) return;
  mixpanel.track(event, properties);
}

// Called on every route change (see Layout.tsx's analytics effect).
export function page(pathname: string): void {
  track(resolvePageEvent(pathname), { page: pathname });
}

// Called once, right after a real login succeeds (see AuthContext.tsx).
// Sets profile properties visible in Mixpanel's Users view AND registers
// them as super properties on this session's events -- role/organization
// only, never an email or name, since those aren't needed for the funnel
// analysis this was scoped for.
export function identify(user: { id: string; role: string; organization_id: string }): void {
  if (!mixpanel) return;
  mixpanel.identify(user.id);
  mixpanel.people.set({
    role: user.role,
    organization: user.organization_id,
    environment: ENVIRONMENT,
  });
  mixpanel.register({ role: user.role, organization: user.organization_id });
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
