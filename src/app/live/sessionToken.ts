// Phase 10 (RBAC.md): the bearer token from POST /v1/auth/login. This is
// the session id itself (see server/app/services/auth_service.py) -- a
// real, working credential, not a placeholder alongside the operator key
// in operatorKey.ts. Both can be present in the browser; the backend
// always checks the Operator Key first (see require_permission), so a
// logged-in human user should leave the Operator Key field empty.
const STORAGE_KEY = "payreality_session_token";

export function getSessionToken(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setSessionToken(token: string): void {
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}

export function clearSessionToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}
