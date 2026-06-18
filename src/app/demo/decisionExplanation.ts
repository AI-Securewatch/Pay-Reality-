import type {
  Approval,
  DecisionIntercept,
  DemoState,
  EvidenceRecord,
  Policy,
  TimelineEvent,
} from "./demoTypes";

export interface EvaluatedPolicyView {
  name: string;
  reason: string;
  result: string;
  confidence?: number;
}

export interface ApprovalChainStep {
  label: string;
  status: "completed" | "pending" | "blocked" | "current";
}

export interface EvidenceArtifactView {
  label: string;
  status: "Pending" | "Generated" | "Verified";
}

export interface DecisionExplanation {
  intercept: DecisionIntercept;
  approval?: Approval;
  evidence?: EvidenceRecord;
  agentTier?: string;
  policies: EvaluatedPolicyView[];
  reasoning: string;
  authorityRequired: string;
  authorityOutcome: string;
  approvalChain: ApprovalChainStep[];
  evidenceArtifacts: EvidenceArtifactView[];
  insuranceImpact: string;
  timeline: TimelineEvent[];
}

function parseAmount(amount: string): number {
  const pct = amount.match(/([+-]?\d+)%/);
  if (pct) return Math.abs(parseInt(pct[1], 10));
  return parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
}

function policyTriggerReason(policy: Policy, intercept: DecisionIntercept): string {
  const amount = parseAmount(intercept.amount);
  if (policy.thresholdAmount && amount >= policy.thresholdAmount) {
    return `Triggered because amount exceeded $${policy.thresholdAmount.toLocaleString()}`;
  }
  if (policy.rule.toLowerCase().includes("vendor") || policy.name.toLowerCase().includes("kyc")) {
    return "Triggered because vendor onboarding requires KYC verification";
  }
  if (policy.rule.toLowerCase().includes("salary") || policy.rule.toLowerCase().includes("payroll")) {
    return "Triggered because adjustment exceeded delegated authority threshold";
  }
  if (policy.rule.toLowerCase().includes("evidence") || policy.category.includes("Evidence")) {
    return `Triggered because transaction classified as ${intercept.risk} Risk`;
  }
  if (policy.requiredApprover) {
    return `Triggered because ${policy.requiredApprover} approval is required for this action`;
  }
  return `Triggered during ${intercept.action} policy evaluation`;
}

function resolvePolicies(state: DemoState, intercept: DecisionIntercept, evidence?: EvidenceRecord): Policy[] {
  const fromIds = intercept.policyIds
    .map((id) => state.policies.find((p) => p.id === id))
    .filter((p): p is Policy => !!p);

  if (fromIds.length > 0) return fromIds;

  const names = evidence?.policiesEvaluated ?? [];
  const fromNames = names
    .map((name) => state.policies.find((p) => p.name === name))
    .filter((p): p is Policy => !!p);

  if (fromNames.length > 0) return fromNames;

  const triggerMatch = state.policies.find((p) => p.name === intercept.policyTrigger);
  if (triggerMatch) return [triggerMatch];

  return state.policies.filter((p) =>
    p.agents.some((a) => intercept.agent.toLowerCase().includes(a.toLowerCase().split(" ")[0]))
  );
}

function buildEvaluatedPolicies(
  policies: Policy[],
  intercept: DecisionIntercept,
  evidence?: EvidenceRecord
): EvaluatedPolicyView[] {
  if (policies.length > 0) {
    return policies.map((p) => ({
      name: p.name,
      reason: policyTriggerReason(p, intercept),
      result: "Triggered",
      confidence: p.confidence,
    }));
  }

  if (evidence?.policiesEvaluated.length) {
    return evidence.policiesEvaluated.map((name) => ({
      name,
      reason: policyTriggerReason(
        {
          id: "",
          name,
          rule: name,
          active: true,
          triggered: 0,
          agents: [intercept.agent],
          category: "Governance",
          lastModified: "",
        },
        intercept
      ),
      result: "Triggered",
      confidence: 95,
    }));
  }

  if (intercept.policyTrigger && intercept.policyTrigger !== "Auto-Approved") {
    return [
      {
        name: intercept.policyTrigger,
        reason: `Primary control matched during ${intercept.action} evaluation`,
        result: "Triggered",
        confidence: 94,
      },
    ];
  }

  return [];
}

function buildReasoning(
  intercept: DecisionIntercept,
  policies: EvaluatedPolicyView[],
  agentTier?: string
): string {
  const amount = parseAmount(intercept.amount);
  const policyNames = policies.map((p) => p.name);
  const parts: string[] = [];

  if (policyNames.length > 0) {
    if (policyNames.length === 1) {
      parts.push(`The ${intercept.action.toLowerCase()} matched the "${policyNames[0]}" governance control.`);
    } else {
      parts.push(
        `The requested ${intercept.action.toLowerCase()} matched multiple governance controls: ${policyNames.join(", ")}.`
      );
    }
  }

  if (amount >= 250000) {
    parts.push(
      "The transfer amount exceeded both the CFO approval threshold and executive escalation threshold."
    );
  } else if (amount >= 100000) {
    parts.push("The transaction amount exceeded the CFO approval threshold defined in active policy controls.");
  } else if (intercept.amount.includes("%")) {
    parts.push(
      `The ${intercept.amount} adjustment exceeded the delegated authority limit for automated execution.`
    );
  }

  if (intercept.authorityResult.toLowerCase().includes("violation") ||
      intercept.authorityResult.toLowerCase().includes("missing") ||
      intercept.authorityResult.toLowerCase().includes("exceeded")) {
    parts.push(
      `The ${intercept.agent} does not possess sufficient delegated authority${agentTier ? ` at the ${agentTier} tier` : ""} to independently authorize this action.`
    );
  }

  if (intercept.status === "Pending") {
    parts.push(
      "PayReality blocked automatic execution and initiated an approval workflow requiring human review before the action can proceed."
    );
  } else if (intercept.status === "Approved" || intercept.status === "Resolved") {
    parts.push(
      "Required approvals were completed and authority was verified before execution was authorized."
    );
  } else if (intercept.status === "Rejected") {
    parts.push(
      "The action was blocked after authority verification failed or approval was denied."
    );
  }

  return parts.join(" ");
}

function buildApprovalChain(
  intercept: DecisionIntercept,
  approval?: Approval
): ApprovalChainStep[] {
  const steps: ApprovalChainStep[] = [
    {
      label: intercept.agent,
      status: "completed",
    },
  ];

  const roles = approval?.approverRole
    ? approval.approverRole.split(/\+|,/).map((r) => r.trim())
    : intercept.approver.split(/\+|,|→/).map((r) => r.trim()).filter(Boolean);

  const uniqueRoles = roles.filter((r) => !r.toLowerCase().includes("system") && r !== intercept.agent);

  uniqueRoles.forEach((role, index) => {
    let status: ApprovalChainStep["status"] = "pending";
    if (approval?.status === "approved") status = "completed";
    else if (approval?.status === "rejected") status = "blocked";
    else if (index === 0 && intercept.status === "Pending") status = "current";

    steps.push({
      label: role.includes("Review") ? role : `${role} Review`,
      status,
    });
  });

  if (intercept.status === "Approved" || intercept.status === "Resolved") {
    steps.push({ label: "Execution Authorized", status: "completed" });
  } else if (intercept.status === "Rejected") {
    steps.push({ label: "Execution Blocked", status: "blocked" });
  } else {
    steps.push({ label: "Execution Authorized", status: "pending" });
  }

  return steps;
}

function artifactStatus(
  exists: boolean,
  verified: boolean
): EvidenceArtifactView["status"] {
  if (verified) return "Verified";
  if (exists) return "Generated";
  return "Pending";
}

function buildEvidenceArtifacts(
  intercept: DecisionIntercept,
  evidence?: EvidenceRecord,
  approval?: Approval
): EvidenceArtifactView[] {
  const hasEvidence = !!evidence;
  const verified = evidence?.status === "VERIFIED";
  const approvalDone = approval?.status === "approved";

  return [
    { label: "Decision Record", status: artifactStatus(hasEvidence, verified) },
    { label: "Policy Evaluation Record", status: artifactStatus(hasEvidence, verified) },
    {
      label: "Approval Audit Trail",
      status: approvalDone ? "Verified" : approval ? "Generated" : "Pending",
    },
    {
      label: "Risk Assessment",
      status: artifactStatus(hasEvidence, verified),
    },
    {
      label: "Governance Trace",
      status: artifactStatus(hasEvidence, verified || approvalDone),
    },
  ];
}

function buildInsuranceImpact(
  intercept: DecisionIntercept,
  approval: Approval | undefined,
  insuranceScore: number
): string {
  if (approval?.status === "approved" || intercept.status === "Approved" || intercept.status === "Resolved") {
    return `Action governed and approved — contributes +2 Insurance Readiness points (current score: ${insuranceScore}/100). Evidence coverage and approval compliance improved.`;
  }
  if (approval?.status === "rejected" || intercept.status === "Rejected") {
    return "Risk mitigated — unauthorized action blocked. Evidence coverage improved through documented denial and governance trace.";
  }
  return `Pending approval — insurance score updates upon completion. Projected +2 points when approved (current score: ${insuranceScore}/100).`;
}

function getDecisionTimeline(
  state: DemoState,
  intercept: DecisionIntercept,
  evidence?: EvidenceRecord,
  approval?: Approval
): TimelineEvent[] {
  const related = state.timeline.filter(
    (e) =>
      e.message.includes(intercept.id) ||
      (intercept.evidenceId && e.message.includes(intercept.evidenceId)) ||
      (intercept.approvalId && e.message.includes(intercept.approvalId)) ||
      (evidence && e.message.includes(evidence.id)) ||
      (approval && e.message.includes(approval.id)) ||
      (e.message.includes(intercept.agent) &&
        (e.message.toLowerCase().includes(intercept.action.toLowerCase().split(" ")[0]) ||
          e.type === "intercept" ||
          e.type === "approval"))
  );

  if (related.length > 0) return related;

  const synthetic: TimelineEvent[] = [
    { id: "syn-1", time: intercept.timestamp, message: `${intercept.agent} initiated ${intercept.action}`, type: "action" },
    { id: "syn-2", time: intercept.timestamp, message: "Policy evaluation completed", type: "policy" },
  ];

  if (intercept.authorityResult.toLowerCase().includes("violation") ||
      intercept.authorityResult.toLowerCase().includes("exceeded") ||
      intercept.authorityResult.toLowerCase().includes("missing")) {
    synthetic.push({
      id: "syn-3",
      time: intercept.timestamp,
      message: "Authority violation detected",
      type: "intercept",
    });
  }

  synthetic.push({
    id: "syn-4",
    time: intercept.timestamp,
    message: `Decision intercept ${intercept.id} created`,
    type: "intercept",
  });

  if (approval) {
    synthetic.push({
      id: "syn-5",
      time: approval.time,
      message: `Approval requested — ${approval.approverRole}`,
      type: "approval",
    });
  }

  if (evidence) {
    synthetic.push({
      id: "syn-6",
      time: intercept.timestamp,
      message: `Evidence package ${evidence.id} created`,
      type: "evidence",
    });
  }

  return synthetic;
}

export function buildDecisionExplanation(
  state: DemoState,
  interceptId: string
): DecisionExplanation | null {
  const intercept = state.intercepts.find((i) => i.id === interceptId);
  if (!intercept) return null;

  const approval = state.approvals.find(
    (a) => a.id === intercept.approvalId || a.interceptId === intercept.id
  );
  const evidence = state.evidence.find(
    (e) => e.decisionId === intercept.id || e.id === intercept.evidenceId
  );
  const agent = state.agents.find((a) => a.name === intercept.agent);

  const resolvedPolicies = resolvePolicies(state, intercept, evidence);
  const policies = buildEvaluatedPolicies(resolvedPolicies, intercept, evidence);

  const authorityRequired =
    approval?.approverRole ||
    intercept.requiredApproval ||
    resolvedPolicies
      .map((p) => p.requiredApprover)
      .filter(Boolean)
      .join(" + ") ||
    intercept.approver;

  let authorityOutcome = "Approval Required";
  if (intercept.status === "Approved" || intercept.status === "Resolved") authorityOutcome = "Approved";
  else if (intercept.status === "Rejected") authorityOutcome = "Blocked";
  else if (intercept.authorityResult.toLowerCase().includes("within")) authorityOutcome = "Auto-Approved";

  return {
    intercept,
    approval,
    evidence,
    agentTier: agent?.authorityTier,
    policies,
    reasoning: buildReasoning(intercept, policies, agent?.authorityTier),
    authorityRequired,
    authorityOutcome,
    approvalChain: buildApprovalChain(intercept, approval),
    evidenceArtifacts: buildEvidenceArtifacts(intercept, evidence, approval),
    insuranceImpact: buildInsuranceImpact(intercept, approval, state.insurance.score),
    timeline: getDecisionTimeline(state, intercept, evidence, approval),
  };
}
