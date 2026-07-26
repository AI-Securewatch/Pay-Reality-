import { ApiError } from "./apiClient";

// A clean, human sentence for any failed action, never the raw backend
// error payload. Previously several pages showed
// `${action} failed: ${JSON.stringify(e.body)}` directly to the user,
// exposing internal validation payloads; this is the one place that
// decision is made now.
export function describeApiError(e: unknown, action: string): string {
  if (e instanceof ApiError) {
    return `${action} failed. Please try again, or contact support if this continues.`;
  }
  return `${action} failed. Check your connection and try again.`;
}

// "pending_review", "VERIFIED", "HUMAN_REVIEW" -> "Pending review",
// "Verified", "Human review". Used everywhere a status/outcome enum is
// shown as text, regardless of what case the API sent it in, so the
// same value never reads differently on different pages.
export function formatStatus(status: string): string {
  const spaced = status.toLowerCase().replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
