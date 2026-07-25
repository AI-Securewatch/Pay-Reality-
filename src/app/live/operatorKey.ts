// The backend now gates policy review/compile/activate and decision
// resolution behind a shared operator credential (see server/app/security.py
// verify_operator_key) since there's no human login/RBAC system yet. This
// stores that credential in the browser so the app can keep calling those
// real endpoints; it is not a mock auth layer, it is the actual header
// the API requires.
const STORAGE_KEY = "payreality_operator_key";

export function getOperatorKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setOperatorKey(key: string): void {
  // Trimmed defensively: a copy-pasted key picking up a leading/trailing
  // newline or space looks identical in the input field but fails the
  // backend's exact byte comparison (hmac.compare_digest), producing a
  // confusing invalid_operator_key for what looks like the right key.
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  else localStorage.removeItem(STORAGE_KEY);
}
