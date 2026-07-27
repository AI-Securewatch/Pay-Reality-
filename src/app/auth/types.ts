export interface CurrentUser {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  must_reset_password: boolean;
  last_login_at: string | null;
  permissions: string[];
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: CurrentUser;
}

// Mirrors server/app/domain/rbac/permissions.py's Role enum exactly --
// kept as a plain string union, not re-derived from the backend at
// runtime, matching this codebase's existing convention of hand-synced
// frontend types (see policy-studio/types.ts's own note on this).
export const ROLE_LABELS: Record<string, string> = {
  owner: "Organisation Owner",
  governance_admin: "Governance Administrator",
  agent_admin: "Agent Administrator",
  reviewer: "Reviewer",
  auditor: "Auditor",
  executive: "Executive",
};

export const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS);
