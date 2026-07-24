// Named distinctly from src/app/demo/demoTypes.ts on purpose -- nothing in
// the demo should ever import from here or vice versa (the demo stays a
// fully separate, untouched concern; see plan's "Demo preservation").

export interface LivePrincipal {
  id: string;
  name: string;
  created_at: string;
}

export interface LiveAgent {
  id: string;
  certificate_id: string | null;
  name: string;
  acting_for_principal_id: string;
  status: "active" | "suspended" | "revoked";
  owner: string | null;
  description: string | null;
  created_at: string;
}

export interface LiveDocument {
  document_id: string;
  name: string;
  status: "extraction_pending" | "extracted" | "extraction_failed";
  uploaded_at: string;
}

export interface LiveAuthority {
  authority_id: string;
  document_id: string;
  principal_id: string;
  scope: string;
  limit_amount: number | null;
  currency: string | null;
  conditions: unknown[];
  source_excerpt: string | null;
  source_page: number | null;
  status: "pending_review" | "approved" | "rejected";
  reviewer_id: string | null;
  rejection_reason: string | null;
  validation_flags: string[];
}

export interface LivePolicy {
  policy_id: string;
  version: number;
  status: "draft" | "compiled" | "active" | "retired";
  bundle_hash: string;
  compiled_at: string | null;
  activated_at: string | null;
  retired_at: string | null;
}

export type DecisionOutcome = "ALLOW" | "DENY" | "HUMAN_REVIEW";

export interface LiveDecisionSummary {
  outcome: DecisionOutcome;
  decision_id: string;
  evaluated_mandates: string[];
  reason: string | null;
}

export interface SubmitIntentResult {
  intent_id: string;
  decision: LiveDecisionSummary;
  evidence_id: string;
  status: "PENDING" | "RESOLVED";
}

export interface LiveResolution {
  resolution: "approved" | "denied";
  resolved_by: string;
  reason: string | null;
  created_at: string;
}

export interface LiveDecision {
  id: string;
  status: "PENDING" | "RESOLVED";
  outcome: DecisionOutcome;
  reason: string | null;
  agent_id: string;
  action: string;
  amount: number;
  currency: string;
  evaluated_mandates: string[];
  resolution: LiveResolution | null;
}

export interface LiveEvidence {
  evidence_id: string;
  decision_id: string;
  payload: Record<string, unknown>;
  key_id: string;
  signature: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  created_at: string;
}
