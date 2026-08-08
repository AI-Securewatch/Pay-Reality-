import { useEffect, useState } from "react";

/** Ticks every 15s so any relative-time string re-renders and keeps advancing while a visitor watches. Demo-only. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "14 seconds ago" / "3 minutes ago" / "2 hours ago" -- falls back to a locale date beyond a day. */
export function formatRelativeTime(date: Date | string, now: number = Date.now()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now - target.getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} second${diffSec === 1 ? "" : "s"} ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  return target.toLocaleDateString();
}

// The demo "session start" instant: every fixture timestamp expressed as
// "N seconds/minutes ago" is computed relative to this, not to build
// time, so the numbers are accurate whenever someone actually visits and
// keep advancing for as long as they stay (via useNow above), instead of
// slowly going stale as time passes since the last deploy.
const SESSION_START = Date.now();

/** Build an ISO timestamp `offsetMs` before the moment this module first loaded in the visitor's browser. */
export function agoMs(offsetMs: number): string {
  return new Date(SESSION_START - offsetMs).toISOString();
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
