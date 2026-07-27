// A per-browser display preference, not an organisation-wide policy --
// deliberately not stored in Organization.settings server-side (see
// ORGANISATION_SETTINGS.md's General tab). Persisted the same way
// operatorKey.ts and sessionToken.ts persist their own local values.
const STORAGE_KEY = "payreality_theme";

export type Theme = "dark" | "light";

// Light is the platform default: a first-time visitor with no stored
// preference gets light mode. Only an explicit "dark" in storage (the
// user picked it in Organisation Settings > General) opts back into dark.
export function getTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

// Called once, before the app renders (main.tsx), so the correct theme
// is already on <html> before first paint rather than flashing dark
// then switching to light.
export function initTheme(): void {
  applyTheme(getTheme());
}
