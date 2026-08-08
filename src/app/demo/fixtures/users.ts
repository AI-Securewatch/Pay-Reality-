import type { OrgUser } from "../../organization/types";
import type { CurrentUser } from "../../auth/types";
import { agoMs, MINUTE, DAY } from "../liveClock";
import { ORG_ID } from "./organization";

export const USER_OKONKWO = "user-okonkwo";
export const USER_CHANDRASEKARAN = "user-chandrasekaran";
export const USER_RUIZ = "user-ruiz";
export const USER_WEBB = "user-webb";
export const USER_KIM = "user-kim";
export const USER_WHITFIELD = "user-whitfield";

export const demoUsers: OrgUser[] = [
  { id: USER_CHANDRASEKARAN, email: "priya.chandrasekaran@meridianindustrial.com", name: "Priya Chandrasekaran", role: "owner", status: "active", mfa_enabled: true, last_login_at: agoMs(35 * MINUTE), created_at: agoMs(300 * DAY) },
  { id: USER_OKONKWO, email: "david.okonkwo@meridianindustrial.com", name: "David Okonkwo", role: "governance_admin", status: "active", mfa_enabled: true, last_login_at: agoMs(2 * MINUTE), created_at: agoMs(280 * DAY) },
  { id: USER_RUIZ, email: "elena.ruiz@meridianindustrial.com", name: "Elena Ruiz", role: "reviewer", status: "active", mfa_enabled: true, last_login_at: agoMs(50 * MINUTE), created_at: agoMs(250 * DAY) },
  { id: USER_WEBB, email: "marcus.webb@meridianindustrial.com", name: "Marcus Webb", role: "agent_admin", status: "active", mfa_enabled: true, last_login_at: agoMs(4 * 60 * MINUTE), created_at: agoMs(250 * DAY) },
  { id: USER_KIM, email: "sarah.kim@meridianindustrial.com", name: "Sarah Kim", role: "auditor", status: "active", mfa_enabled: false, last_login_at: agoMs(DAY), created_at: agoMs(180 * DAY) },
  { id: USER_WHITFIELD, email: "james.whitfield@meridianindustrial.com", name: "James Whitfield", role: "executive", status: "active", mfa_enabled: true, last_login_at: agoMs(3 * DAY), created_at: agoMs(180 * DAY) },
];

// The identity a demo visitor is transparently "signed in" as -- David
// Okonkwo, already the AP-Invoice-Agent's delegating principal and the
// star policy's owner, so every "Recorded as the reviewer" / "Approved
// by" surface in the demo reinforces the same person rather than
// introducing an unrelated placeholder name.
export const demoCurrentUser: CurrentUser = {
  id: USER_OKONKWO,
  organization_id: ORG_ID,
  email: "david.okonkwo@meridianindustrial.com",
  name: "David Okonkwo",
  role: "governance_admin",
  status: "active",
  mfa_enabled: true,
  must_reset_password: false,
  last_login_at: agoMs(2 * MINUTE),
  permissions: ["authority.review", "users.manage", "settings.view"],
};
