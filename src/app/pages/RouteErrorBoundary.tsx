import { useEffect, useState } from "react";
import { Link, useRouteError } from "react-router";
import { AlertTriangle } from "lucide-react";

// Every real page is loaded via a lazy `import()` (routes.tsx), keyed to
// a content-hashed chunk filename. When a new deploy replaces those
// files, a browser tab that has been open since before the deploy can
// still try to navigate to a chunk filename that no longer exists on
// the server, surfacing as "Failed to fetch dynamically imported
// module" (Chrome), "error loading dynamically imported module"
// (Firefox), or "Importing a module script failed" (Safari). The fix is
// not to avoid code splitting; it's to recognize this one specific,
// recoverable failure and reload once to pick up the current deploy,
// rather than showing a broken app or the default router error screen.
const STALE_CHUNK_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
];

const RELOAD_GUARD_KEY = "pr-stale-chunk-reload-attempted-at";
const RELOAD_GUARD_WINDOW_MS = 10_000;

function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return STALE_CHUNK_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!isStaleChunkError(error)) return;
    // Reload automatically, but only once per short window: if the app
    // is still broken immediately after a fresh reload, this is a real
    // error, not a stale chunk, and looping reloads would only hide
    // that. A time-boxed guard (rather than a permanent one) still lets
    // a tab left open across a *later* deploy recover on its own too.
    const lastAttempt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - lastAttempt < RELOAD_GUARD_WINDOW_MS) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    setReloading(true);
    window.location.reload();
  }, [error]);

  if (reloading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8" style={{ backgroundColor: "var(--pr-bg-primary)" }}>
        <p style={{ color: "var(--pr-text-muted)" }}>Loading the latest version...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-8" style={{ backgroundColor: "var(--pr-bg-primary)" }}>
      <div className="text-center max-w-md">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
        >
          <AlertTriangle className="w-12 h-12" style={{ color: "var(--pr-warning-amber)" }} />
        </div>
        <h1 className="mb-4" style={{ color: "var(--pr-text-primary)" }}>Something went wrong</h1>
        <p className="mb-6" style={{ color: "var(--pr-text-muted)" }}>
          This page failed to load. Reloading usually fixes this, especially if the app was updated
          since you opened this tab.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
          >
            Reload page
          </button>
          <Link
            to="/"
            className="px-6 py-3 rounded-lg border transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--pr-text-primary)" }}
          >
            Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
