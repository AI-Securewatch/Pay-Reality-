import type { LiveAgent, AgentStatus, AgentHealth } from "../../live/types";
import { agoMs, SECOND, MINUTE, HOUR } from "../liveClock";
import { PRINCIPAL_OKONKWO, PRINCIPAL_RUIZ, PRINCIPAL_WEBB, PRINCIPAL_CHANDRASEKARAN } from "./principals";

export const AGENT_AP_INVOICE = "agent-ap-invoice";
export const AGENT_PO_APPROVAL = "agent-po-approval";
export const AGENT_VENDOR_ONBOARDING = "agent-vendor-onboarding";
export const AGENT_TREASURY_RECON = "agent-treasury-recon";
export const AGENT_ACCESS_PROVISIONING = "agent-access-provisioning";
export const AGENT_EXPENSE_AUDIT = "agent-expense-audit";
export const AGENT_CONTRACT_REVIEW = "agent-contract-review";
export const AGENT_VENDOR_RISK = "agent-vendor-risk";
export const AGENT_LEGACY_RECON = "agent-legacy-recon";

function agent(overrides: Partial<LiveAgent> & { id: string; name: string; acting_for_principal_id: string; status: AgentStatus }): LiveAgent {
  return {
    certificate_id: `cert-${overrides.id}`,
    certificate_status: overrides.status === "registered" ? null : "active",
    owner: "IT Operations",
    business_unit: "Corporate Services",
    environment: "production",
    tags: [],
    description: null,
    purpose: null,
    model: "claude-sonnet-5",
    version: "1.4.0",
    runtime: "python-sdk",
    platform: "aws",
    labels: [],
    sdk_version: "2.3.1",
    last_seen_at: agoMs(30 * SECOND),
    health: "healthy" as AgentHealth,
    rotation_requested_at: null,
    created_at: agoMs(120 * 24 * HOUR),
    updated_at: agoMs(30 * SECOND),
    ...overrides,
  };
}

export const demoAgents: LiveAgent[] = [
  agent({
    id: AGENT_AP_INVOICE,
    name: "AP-Invoice-Agent",
    acting_for_principal_id: PRINCIPAL_OKONKWO,
    status: "active",
    purpose: "Reviews and pays incoming supplier invoices within delegated Treasury authority.",
    tags: ["finance", "accounts-payable"],
    last_seen_at: agoMs(26 * SECOND),
    updated_at: agoMs(26 * SECOND),
  }),
  agent({
    id: AGENT_PO_APPROVAL,
    name: "PO-Approval-Agent",
    acting_for_principal_id: PRINCIPAL_RUIZ,
    status: "active",
    purpose: "Approves purchase orders against sourcing contracts and budget limits.",
    tags: ["procurement"],
    last_seen_at: agoMs(90 * SECOND),
    updated_at: agoMs(90 * SECOND),
  }),
  agent({
    id: AGENT_VENDOR_ONBOARDING,
    name: "Vendor-Onboarding-Agent",
    acting_for_principal_id: PRINCIPAL_RUIZ,
    status: "active",
    purpose: "Runs due-diligence checks on new suppliers before they can be paid.",
    tags: ["procurement", "vendor-management"],
    last_seen_at: agoMs(4 * MINUTE),
    updated_at: agoMs(4 * MINUTE),
  }),
  agent({
    id: AGENT_TREASURY_RECON,
    name: "Treasury-Reconciliation-Agent",
    acting_for_principal_id: PRINCIPAL_OKONKWO,
    status: "active",
    purpose: "Reconciles daily cash positions against the general ledger.",
    tags: ["finance", "treasury"],
    last_seen_at: agoMs(11 * MINUTE),
    updated_at: agoMs(11 * MINUTE),
  }),
  agent({
    id: AGENT_ACCESS_PROVISIONING,
    name: "Access-Provisioning-Agent",
    acting_for_principal_id: PRINCIPAL_WEBB,
    status: "active",
    purpose: "Grants and revokes system access requests under least-privilege policy.",
    tags: ["it", "security"],
    last_seen_at: agoMs(2 * MINUTE),
    updated_at: agoMs(2 * MINUTE),
  }),
  agent({
    id: AGENT_EXPENSE_AUDIT,
    name: "Expense-Audit-Agent",
    acting_for_principal_id: PRINCIPAL_CHANDRASEKARAN,
    status: "active",
    purpose: "Flags expense report anomalies for Finance review.",
    tags: ["finance", "audit"],
    last_seen_at: agoMs(38 * MINUTE),
    updated_at: agoMs(38 * MINUTE),
  }),
  agent({
    id: AGENT_CONTRACT_REVIEW,
    name: "Contract-Review-Agent",
    acting_for_principal_id: PRINCIPAL_RUIZ,
    status: "suspended",
    purpose: "Reviews supplier contract renewal terms against negotiated caps.",
    tags: ["procurement", "legal"],
    last_seen_at: agoMs(3 * HOUR),
    updated_at: agoMs(20 * MINUTE),
  }),
  agent({
    id: AGENT_VENDOR_RISK,
    name: "Vendor-Risk-Agent",
    acting_for_principal_id: PRINCIPAL_RUIZ,
    status: "registered",
    purpose: "Continuously screens suppliers against sanctions and risk watchlists.",
    tags: ["procurement", "risk"],
    last_seen_at: null,
    health: "unknown",
    updated_at: agoMs(6 * HOUR),
  }),
  agent({
    id: AGENT_LEGACY_RECON,
    name: "Legacy-Reconciliation-Bot",
    acting_for_principal_id: PRINCIPAL_OKONKWO,
    status: "retired",
    purpose: "Superseded by Treasury-Reconciliation-Agent.",
    tags: ["finance", "legacy"],
    last_seen_at: agoMs(45 * 24 * HOUR),
    health: "offline",
    updated_at: agoMs(45 * 24 * HOUR),
  }),
];

export function findDemoAgent(id: string): LiveAgent | undefined {
  return demoAgents.find((a) => a.id === id);
}
