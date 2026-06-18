import type {
  Agent,
  Approval,
  DemoState,
  DecisionIntercept,
  EvaluationInput,
  EvaluationResult,
  EvidenceRecord,
  InsuranceMetrics,
  Policy,
  RiskLevel,
  TimelineEvent,
} from "./demoTypes";
import { createInitialDemoState, createEmptyInsuranceMetrics } from "./demoSeed";
import { extractPoliciesFromDocuments } from "./documentExtraction";

function parseAmount(amount: string): number {
  const pct = amount.match(/([+-]?\d+)%/);
  if (pct) return Math.abs(parseInt(pct[1], 10)) * 1000;
  const num = amount.replace(/[^0-9.]/g, "");
  return parseFloat(num) || 0;
}

function makeHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(32, "0").slice(0, 32);
}

function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function relativeTime(): string {
  return "Just now";
}

export function nextId(state: DemoState, type: "decision" | "approval" | "evidence" | "timeline"): string {
  const counters = { ...state.idCounters };
  counters[type]++;
  const prefixes = { decision: "DEC", approval: "APR", evidence: "VIC", timeline: "tl" };
  if (type === "evidence") {
    return `${prefixes[type]}-${counters[type]}-A${String(counters[type] % 26).charCodeAt(0)}`;
  }
  return `${prefixes[type]}-${counters[type]}`;
}

export function recalculateInsurance(state: DemoState): InsuranceMetrics {
  const hasGovernanceActivity =
    state.policies.length > 0 ||
    state.documents.length > 0 ||
    state.intercepts.length > 0 ||
    state.evidence.length > 0 ||
    state.approvals.length > 0;

  if (!hasGovernanceActivity) {
    return createEmptyInsuranceMetrics();
  }

  const activePolicies = state.policies.filter((p) => p.active).length;
  const totalPolicies = state.policies.length;
  const verifiedEvidence = state.evidence.filter((e) => e.status === "VERIFIED").length;
  const totalEvidence = Math.max(state.evidence.length, 1);
  const completedApprovals = state.approvals.filter((a) => a.status === "approved").length;
  const totalApprovals = Math.max(state.approvals.length, 1);
  const resolvedIntercepts = state.intercepts.filter(
    (i) => i.status === "Approved" || i.status === "Resolved"
  ).length;

  const policyFactor = Math.min(100, activePolicies * 8 + state.documents.length * 5);
  const evidenceFactor = Math.min(100, (verifiedEvidence / totalEvidence) * 70 + state.evidence.length * 4);
  const approvalFactor = Math.min(100, (completedApprovals / totalApprovals) * 60 + state.approvals.length * 3);
  const coverageFactor = Math.min(
    100,
    activePolicies * 6 + state.documents.length * 8
  );
  const controlFactor = Math.min(100, resolvedIntercepts * 8 + activePolicies * 4);

  const score = Math.round(
    policyFactor * 0.25 +
      evidenceFactor * 0.25 +
      approvalFactor * 0.2 +
      coverageFactor * 0.25 +
      controlFactor * 0.05
  );

  const clamped = Math.min(99, Math.max(0, score));

  return {
    score: clamped,
    governanceCoverage: Math.min(99, coverageFactor),
    controlEffectiveness: Math.min(99, controlFactor),
    authorityCoverage: Math.min(99, activePolicies * 5 + state.documents.length * 4),
    evidenceIntegrity: Math.min(100, evidenceFactor),
    approvalCompliance: Math.min(99, approvalFactor),
    policyEnforcement: Math.min(100, policyFactor),
    governedDecisions: state.intercepts.length + state.evidence.length,
    riskReduction: Math.min(95, clamped * 0.85),
    riskLabel:
      clamped >= 85
        ? "LOW INSURANCE RISK"
        : clamped >= 50
          ? "MODERATE INSURANCE RISK"
          : clamped > 0
            ? "ELEVATED INSURANCE RISK"
            : "NOT ASSESSED",
  };
}

export function evaluateAction(state: DemoState, input: EvaluationInput): EvaluationResult {
  const amount = parseAmount(input.amount);
  const matched: Policy[] = [];
  const requiredApprovals: string[] = [];

  for (const policy of state.policies.filter((p) => p.active)) {
    const agentMatch = policy.agents.some((a) => input.agent.includes(a.split(" ")[0]) || input.agent === a);
    if (!agentMatch && policy.agents.length > 0) {
      const partial = policy.agents.some((a) => input.agent.toLowerCase().includes(a.toLowerCase().split(" ")[0]));
      if (!partial) continue;
    }

    if (policy.rule.toLowerCase().includes("vendor") && input.action.toLowerCase().includes("vendor")) {
      matched.push(policy);
      if (policy.requiredApprover) requiredApprovals.push(policy.requiredApprover);
    } else if (policy.rule.toLowerCase().includes("payroll") || policy.rule.toLowerCase().includes("salary")) {
      if (input.action.toLowerCase().includes("payroll") || input.action.toLowerCase().includes("salary")) {
        if (policy.thresholdAmount && amount >= 15) matched.push(policy);
        else if (!policy.thresholdAmount) matched.push(policy);
        if (policy.requiredApprover) requiredApprovals.push(policy.requiredApprover);
      }
    } else if (policy.thresholdAmount && amount >= policy.thresholdAmount) {
      matched.push(policy);
      if (policy.requiredApprover) requiredApprovals.push(policy.requiredApprover);
    } else if (
      policy.rule.toLowerCase().includes("wire") &&
      input.action.toLowerCase().includes("wire")
    ) {
      if (policy.thresholdAmount && amount >= policy.thresholdAmount) {
        matched.push(policy);
        if (policy.requiredApprover) requiredApprovals.push(policy.requiredApprover);
      }
    }
  }

  const uniqueApprovals = [...new Set(requiredApprovals)];
  const risk: RiskLevel =
    input.riskLevel ??
    (amount >= 250000 ? "Critical" : amount >= 100000 ? "High" : amount >= 50000 ? "Medium" : "Low");

  if (matched.length === 0) {
    return {
      matchedPolicies: [],
      authorityResult: "Within Delegated Authority",
      requiredApprovals: [],
      outcome: "Auto-Approved",
      risk,
    };
  }

  return {
    matchedPolicies: matched,
    authorityResult: "Authority Violation — Approval Required",
    requiredApprovals: uniqueApprovals.length ? uniqueApprovals : ["CFO"],
    outcome: "Approval Required",
    risk,
  };
}

export function addTimelineEvent(
  state: DemoState,
  message: string,
  type: TimelineEvent["type"]
): { state: DemoState; event: TimelineEvent } {
  const id = nextId(state, "timeline");
  state.idCounters.timeline++;
  const event: TimelineEvent = { id, time: formatTime(), message, type };
  return {
    state: {
      ...state,
      timeline: [event, ...state.timeline].slice(0, 50),
    },
    event,
  };
}

export function mergePolicies(existing: Policy[], incoming: Policy[]): Policy[] {
  const rules = new Set(existing.map((p) => p.rule));
  const merged = [...existing];
  for (const p of incoming) {
    if (!rules.has(p.rule)) {
      merged.unshift(p);
      rules.add(p.rule);
    }
  }
  return merged;
}

export function processDocuments(state: DemoState, fileNames: string[]): DemoState {
  const newPolicies = extractPoliciesFromDocuments(fileNames);
  const policies = mergePolicies(state.policies, newPolicies);
  const now = new Date().toISOString();

  let next = {
    ...state,
    policies,
    documents: [
      ...state.documents,
      ...fileNames.map((name, i) => ({
        id: `doc-${Date.now()}-${i}`,
        name,
        uploadedAt: now,
        controlsExtracted: newPolicies.length,
      })),
    ],
  };

  const events = [
    { message: `Document intelligence processed ${fileNames.length} governance document(s)`, type: "system" as const },
    { message: `${newPolicies.length} enforceable controls extracted and translated to policies`, type: "policy" as const },
    { message: "Governance coverage recalculated after document ingestion", type: "insurance" as const },
  ];

  for (const e of events) {
    next = addTimelineEvent(next, e.message, e.type).state;
  }

  next.insurance = recalculateInsurance(next);
  return next;
}

export function approveApproval(state: DemoState, approvalId: string): DemoState {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval || approval.status !== "pending") return state;

  const approvals = state.approvals.map((a) =>
    a.id === approvalId ? { ...a, status: "approved" as const, completedAt: relativeTime() } : a
  );

  const intercepts = state.intercepts.map((i) =>
    i.approvalId === approvalId
      ? { ...i, status: "Approved" as const, authorityResult: "Authority Verified — Approval Granted" }
      : i
  );

  const evidence = state.evidence.map((e) => {
    if (e.decisionId === approval.interceptId) {
      return {
        ...e,
        status: "VERIFIED" as const,
        approvalOutcome: "Approved",
        approver: `Sarah Chen (${approval.approverRole})`,
        authorityOutcome: "Authority Verified — Approval Granted",
      };
    }
    return e;
  });

  let next: DemoState = { ...state, approvals, intercepts, evidence };
  next = addTimelineEvent(next, `Approval ${approvalId} completed for ${approval.action}`, "approval").state;
  next = addTimelineEvent(next, `Evidence package updated for ${approval.interceptId}`, "evidence").state;
  next = addTimelineEvent(next, "Insurance readiness score recalculated", "insurance").state;
  next.insurance = recalculateInsurance(next);

  next.agents = next.agents.map((a) =>
    a.name === approval.agent
      ? { ...a, lastActivity: relativeTime(), complianceStatus: "Compliant" as const, recentAction: `${approval.action} approved` }
      : a
  );

  return next;
}

export function rejectApproval(state: DemoState, approvalId: string): DemoState {
  const approval = state.approvals.find((a) => a.id === approvalId);
  if (!approval || approval.status !== "pending") return state;

  const approvals = state.approvals.map((a) =>
    a.id === approvalId ? { ...a, status: "rejected" as const, completedAt: relativeTime() } : a
  );

  const intercepts = state.intercepts.map((i) =>
    i.approvalId === approvalId
      ? { ...i, status: "Rejected" as const, authorityResult: "Authority Denied — Action Blocked" }
      : i
  );

  const evidence = state.evidence.map((e) => {
    if (e.decisionId === approval.interceptId) {
      return {
        ...e,
        status: "VERIFIED" as const,
        approvalOutcome: "Rejected",
        authorityOutcome: "Authority Denied — Action Blocked",
      };
    }
    return e;
  });

  let next: DemoState = { ...state, approvals, intercepts, evidence };
  next = addTimelineEvent(next, `Approval ${approvalId} rejected for ${approval.action}`, "approval").state;
  next.insurance = recalculateInsurance(next);
  return next;
}

export function togglePolicy(state: DemoState, policyId: string): DemoState {
  return {
    ...state,
    policies: state.policies.map((p) => (p.id === policyId ? { ...p, active: !p.active } : p)),
    insurance: recalculateInsurance({
      ...state,
      policies: state.policies.map((p) => (p.id === policyId ? { ...p, active: !p.active } : p)),
    }),
  };
}

export function resetEnvironment(): DemoState {
  return createInitialDemoState();
}

export interface ScenarioPayload {
  intercept: DecisionIntercept;
  approval?: Approval;
  evidence: EvidenceRecord;
  timelineMessages: { message: string; type: TimelineEvent["type"] }[];
  agentUpdates?: Partial<Agent>;
}

export function applyScenarioPayload(state: DemoState, payload: ScenarioPayload): DemoState {
  state.idCounters.decision++;
  if (payload.approval) state.idCounters.approval++;
  state.idCounters.evidence++;

  let next: DemoState = {
    ...state,
    intercepts: [payload.intercept, ...state.intercepts],
    approvals: payload.approval ? [payload.approval, ...state.approvals] : state.approvals,
    evidence: [payload.evidence, ...state.evidence],
    policies: state.policies.map((p) =>
      payload.intercept.policyIds.includes(p.id) ? { ...p, triggered: p.triggered + 1 } : p
    ),
  };

  if (payload.agentUpdates) {
    next.agents = next.agents.map((a) =>
      a.name === payload.intercept.agent ? { ...a, ...payload.agentUpdates, lastActivity: relativeTime() } : a
    );
  }

  for (const tl of payload.timelineMessages) {
    next = addTimelineEvent(next, tl.message, tl.type).state;
  }

  next.insurance = recalculateInsurance(next);
  return next;
}

export function demoReducer(state: DemoState, action: import("./demoTypes").DemoAction): DemoState {
  switch (action.type) {
    case "HYDRATE":
    case "SET_STATE":
      return action.state;
    case "RESET":
      return resetEnvironment();
    case "TOGGLE_POLICY":
      return togglePolicy(state, action.policyId);
    case "ADD_POLICY":
      return {
        ...state,
        policies: [action.policy, ...state.policies],
        insurance: recalculateInsurance({ ...state, policies: [action.policy, ...state.policies] }),
      };
    case "ADD_POLICIES": {
      const merged = mergePolicies(state.policies, action.policies);
      const next = { ...state, policies: merged };
      return { ...next, insurance: recalculateInsurance(next) };
    }
    case "PROCESS_DOCUMENTS":
      return processDocuments(state, action.fileNames);
    case "APPROVE":
      return approveApproval(state, action.approvalId);
    case "REJECT":
      return rejectApproval(state, action.approvalId);
    case "SCENARIO_STEP":
      return { ...state, ...action.partial, insurance: recalculateInsurance({ ...state, ...action.partial }) };
    case "ADD_MANUAL_POLICY": {
      const policy: Policy = { ...action.policy, id: `p${Date.now()}` };
      return {
        ...state,
        policies: [policy, ...state.policies],
        insurance: recalculateInsurance({ ...state, policies: [policy, ...state.policies] }),
      };
    }
    default:
      return state;
  }
}

export { formatTimestamp, makeHash, relativeTime, parseAmount };
