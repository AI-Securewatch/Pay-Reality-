export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type InterceptStatus = "Pending" | "Approved" | "Rejected" | "Resolved";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AuthorityTierName = "Executive" | "Manager" | "Operational";

export interface AuthorityTier {
  id: string;
  name: AuthorityTierName;
  description: string;
  approvalLimit: number;
  escalationTo?: AuthorityTierName;
}

export interface Agent {
  id: string;
  name: string;
  status: "Active" | "Inactive";
  department: string;
  framework: string;
  risk: RiskLevel;
  authorityTier: AuthorityTierName;
  permissions: string;
  spendLimit: string;
  coverage: string;
  decisions: number;
  accuracy: string;
  lastActivity: string;
  recentAction?: string;
  complianceStatus: "Compliant" | "Review Required" | "Violation Detected";
}

export interface Policy {
  id: string;
  name: string;
  rule: string;
  active: boolean;
  triggered: number;
  agents: string[];
  category: string;
  lastModified: string;
  confidence?: number;
  source?: "seed" | "document" | "manual";
  thresholdAmount?: number;
  requiredApprover?: string;
}

export interface DecisionIntercept {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  amount: string;
  risk: RiskLevel;
  policyTrigger: string;
  policyIds: string[];
  authorityResult: string;
  requiredApproval: string;
  approver: string;
  status: InterceptStatus;
  evidenceId?: string;
  approvalId?: string;
}

export interface Approval {
  id: string;
  interceptId: string;
  agent: string;
  action: string;
  amount: string;
  requester: string;
  approverRole: string;
  time: string;
  status: ApprovalStatus;
  completedAt?: string;
}

export interface EvidenceRecord {
  id: string;
  decisionId: string;
  hash: string;
  timestamp: string;
  agent: string;
  action: string;
  policiesEvaluated: string[];
  authorityOutcome: string;
  approvalOutcome: string;
  riskClassification: RiskLevel;
  approver: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
}

export interface TimelineEvent {
  id: string;
  time: string;
  message: string;
  type: "action" | "policy" | "intercept" | "approval" | "evidence" | "insurance" | "system";
}

export interface InsuranceMetrics {
  score: number;
  governanceCoverage: number;
  controlEffectiveness: number;
  authorityCoverage: number;
  evidenceIntegrity: number;
  approvalCompliance: number;
  policyEnforcement: number;
  governedDecisions: number;
  riskReduction: number;
  riskLabel: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  uploadedAt: string;
  controlsExtracted: number;
}

export interface DemoState {
  agents: Agent[];
  policies: Policy[];
  intercepts: DecisionIntercept[];
  approvals: Approval[];
  evidence: EvidenceRecord[];
  timeline: TimelineEvent[];
  insurance: InsuranceMetrics;
  authorityTiers: AuthorityTier[];
  documents: UploadedDocument[];
  idCounters: {
    decision: number;
    approval: number;
    evidence: number;
    timeline: number;
  };
}

export type DemoAction =
  | { type: "HYDRATE"; state: DemoState }
  | { type: "RESET" }
  | { type: "SET_STATE"; state: DemoState }
  | { type: "TOGGLE_POLICY"; policyId: string }
  | { type: "ADD_POLICY"; policy: Policy }
  | { type: "ADD_POLICIES"; policies: Policy[] }
  | { type: "PROCESS_DOCUMENTS"; fileNames: string[] }
  | { type: "APPROVE"; approvalId: string }
  | { type: "REJECT"; approvalId: string }
  | { type: "SCENARIO_STEP"; partial: Partial<DemoState> }
  | { type: "ADD_MANUAL_POLICY"; policy: Omit<Policy, "id"> };

export interface EvaluationInput {
  agent: string;
  action: string;
  amount: string;
  department?: string;
  riskLevel?: RiskLevel;
}

export interface EvaluationResult {
  matchedPolicies: Policy[];
  authorityResult: string;
  requiredApprovals: string[];
  outcome: "Auto-Approved" | "Approval Required" | "Blocked";
  risk: RiskLevel;
}
