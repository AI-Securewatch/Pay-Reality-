// Mirrors server/app/schemas/runtime_policy.py exactly. Kept in sync by
// hand since this app has no codegen step; if these drift from the
// backend, the symptom is a runtime shape mismatch, not a compile error,
// the same tradeoff every other page in src/app/live/ already accepts.

export type PolicyStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "compiled"
  | "active"
  | "retired";

export type Effect = "allow" | "deny" | "require_human_review";

export interface Scope {
  principal: string;
  action: string;
  agent: string | null;
  resource: string | null;
}

export interface Condition {
  field: string;
  operator: string;
  value: string | number | boolean | (string | number)[];
}

export interface Constraints {
  delegated_by: string | null;
  expires: string | null;
  evidence_required: boolean;
  risk_level: string | null;
  // Authority-as-a-continuous-object, Stage G: system-set at promotion
  // (authority_id) and deploy (mandate_id), never client-editable. Null
  // whenever this policy has no resolved Authority Builder principal
  // behind it -- delegated_by above remains the fallback in that case.
  authority_id: string | null;
  mandate_id: string | null;
  // Phase 5, Release 2 (Enterprise System binding): client-editable --
  // a reviewer declares which registered EnterpriseSystem this policy's
  // allowed action reaches. Null means none configured.
  enterprise_system_id: string | null;
}

export interface Metadata {
  owner: string | null;
  created_by: string | null;
  tags: string[];
}

export interface RuntimePolicy {
  policy_key: string;
  version: number;
  status: PolicyStatus;
  name: string;
  description: string | null;
  scope: Scope;
  conditions: Condition[];
  effect: Effect;
  constraints: Constraints;
  metadata: Metadata;
  audit: Record<string, unknown> | null;
  bundle_id: string | null;
  bundle_hash: string | null;
  created_at: string;
}

export interface RuntimePolicyRequest {
  name: string;
  description?: string | null;
  scope: Scope;
  conditions: Condition[];
  effect: Effect;
  constraints: Constraints;
  metadata: Metadata;
}

export interface CompilerError {
  code: string;
  message: string;
  policy_id: string | null;
  path: string | null;
}

export interface CompileResult {
  ok: boolean;
  errors: CompilerError[];
  bundle_id: string | null;
  bundle_hash: string | null;
}

export interface DryRunResult {
  decision: "ALLOW" | "DENY" | "HUMAN_REVIEW";
  allow: boolean;
  deny: boolean;
  requires_review: boolean;
  evaluated_mandates: string[];
  review_reason: string | null;
  deny_reason: string | null;
  evidence_required: boolean;
}

export interface DeployResult {
  bundle_id: string;
  bundle_hash: string;
  deployed_at: string;
  // Authority-as-a-continuous-object, Stage I.5: additive. Null whenever
  // this policy has no resolved Authority behind it.
  authority_id: string | null;
  mandate_id: string | null;
}

export interface ConditionDiffEntry {
  kind: "added" | "removed" | "modified" | "unchanged";
  field: string;
  operator: string;
  old_value: unknown;
  new_value: unknown;
}

export interface AffectedAgent {
  id: string;
  name: string;
}

export interface AffectedPolicy {
  policy_key: string;
  name: string;
  version: number;
  status: string;
  same_action: boolean;
}

export interface PolicyDiff {
  conditions: ConditionDiffEntry[];
  scope_changed: boolean;
  effect_changed: boolean;
  constraints_changed: boolean;
  affected_agents: AffectedAgent[];
  affected_policies: AffectedPolicy[];
  risk_impact: "increased" | "decreased" | "mixed" | "unchanged";
  risk_reason: string;
}

export const KNOWN_OPERATORS = ["<=", ">=", "==", "!=", "<", ">", "in", "contains", "exists"] as const;
