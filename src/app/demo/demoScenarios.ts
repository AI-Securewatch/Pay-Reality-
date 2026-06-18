import type { DemoState, TimelineEvent } from "./demoTypes";
import {
  addTimelineEvent,
  applyScenarioPayload,
  formatTimestamp,
  makeHash,
  relativeTime,
  type ScenarioPayload,
} from "./DemoEngine";

function buildTreasuryPayload(state: DemoState): ScenarioPayload {
  const decId = `DEC-${state.idCounters.decision + 1}`;
  const aprId = `APR-${state.idCounters.approval + 1}`;
  const evId = `VIC-${state.idCounters.evidence + 1}-N`;

  return {
    intercept: {
      id: decId,
      timestamp: relativeTime(),
      agent: "Treasury Agent",
      action: "Wire Transfer",
      amount: "$250,000",
      risk: "Critical",
      policyTrigger: "Executive Transfer Threshold",
      policyIds: ["p1", "p2"],
      authorityResult: "Authority Violation — CFO Approval Required",
      requiredApproval: "CFO Approval",
      approver: "Sarah Chen (CFO)",
      status: "Pending",
      evidenceId: evId,
      approvalId: aprId,
    },
    approval: {
      id: aprId,
      interceptId: decId,
      agent: "Treasury Agent",
      action: "Wire Transfer",
      amount: "$250,000",
      requester: "Treasury Agent",
      approverRole: "CFO",
      time: relativeTime(),
      status: "pending",
    },
    evidence: {
      id: evId,
      decisionId: decId,
      hash: makeHash(decId),
      timestamp: formatTimestamp(),
      agent: "Treasury Agent",
      action: "Wire Transfer - $250,000",
      policiesEvaluated: ["High-Value Transfer Control", "Executive Transfer Threshold"],
      authorityOutcome: "Authority Violation — CFO Approval Required",
      approvalOutcome: "Pending CFO Approval",
      riskClassification: "Critical",
      approver: "Pending — Sarah Chen (CFO)",
      status: "PENDING",
    },
    timelineMessages: [
      { message: "Treasury Agent initiated wire transfer for $250,000", type: "action" },
      { message: "Policy evaluation completed — Executive Transfer Threshold matched", type: "policy" },
      { message: `Decision intercept ${decId} triggered — authority violation detected`, type: "intercept" },
      { message: "CFO approval generated for Treasury wire transfer", type: "approval" },
      { message: `Evidence package ${evId} created`, type: "evidence" },
      { message: "Insurance readiness score recalculated", type: "insurance" },
    ],
    agentUpdates: {
      recentAction: "Wire Transfer $250,000 — pending CFO approval",
      complianceStatus: "Review Required",
    },
  };
}

function buildVendorPayload(state: DemoState): ScenarioPayload {
  const decId = `DEC-${state.idCounters.decision + 1}`;
  const aprId = `APR-${state.idCounters.approval + 1}`;
  const evId = `VIC-${state.idCounters.evidence + 1}-N`;

  return {
    intercept: {
      id: decId,
      timestamp: relativeTime(),
      agent: "Procurement Agent",
      action: "Vendor Onboarding",
      amount: "Acme Supplies Ltd",
      risk: "High",
      policyTrigger: "Vendor KYC Verification",
      policyIds: ["p3"],
      authorityResult: "Control Violation — Missing KYC Documentation",
      requiredApproval: "Procurement Director",
      approver: "Procurement Director",
      status: "Pending",
      evidenceId: evId,
      approvalId: aprId,
    },
    approval: {
      id: aprId,
      interceptId: decId,
      agent: "Procurement Agent",
      action: "Vendor Onboarding",
      amount: "$75,000",
      requester: "Procurement Agent",
      approverRole: "Procurement Director",
      time: relativeTime(),
      status: "pending",
    },
    evidence: {
      id: evId,
      decisionId: decId,
      hash: makeHash(decId),
      timestamp: formatTimestamp(),
      agent: "Procurement Agent",
      action: "Vendor Onboarding - Acme Supplies Ltd",
      policiesEvaluated: ["Vendor KYC Verification"],
      authorityOutcome: "Missing KYC Documentation",
      approvalOutcome: "Pending Procurement Director",
      riskClassification: "High",
      approver: "Pending — Procurement Director",
      status: "PENDING",
    },
    timelineMessages: [
      { message: "Procurement Agent created vendor record — KYC documentation missing", type: "action" },
      { message: "Vendor KYC Verification policy triggered", type: "policy" },
      { message: `Decision intercept ${decId} triggered`, type: "intercept" },
      { message: "Procurement Director approval generated", type: "approval" },
      { message: `Evidence package ${evId} created`, type: "evidence" },
      { message: "Risk profile updated for Procurement Agent", type: "system" },
    ],
    agentUpdates: {
      recentAction: "Vendor onboarding — KYC missing",
      complianceStatus: "Violation Detected",
    },
  };
}

function buildPayrollPayload(state: DemoState): ScenarioPayload {
  const decId = `DEC-${state.idCounters.decision + 1}`;
  const aprId = `APR-${state.idCounters.approval + 1}`;
  const evId = `VIC-${state.idCounters.evidence + 1}-N`;

  return {
    intercept: {
      id: decId,
      timestamp: relativeTime(),
      agent: "Payroll Agent",
      action: "Salary Adjustment",
      amount: "+18%",
      risk: "High",
      policyTrigger: "Payroll Adjustment Limit",
      policyIds: ["p4"],
      authorityResult: "Authority Threshold Exceeded — Manager Approval Required",
      requiredApproval: "Manager Approval",
      approver: "Department Manager",
      status: "Pending",
      evidenceId: evId,
      approvalId: aprId,
    },
    approval: {
      id: aprId,
      interceptId: decId,
      agent: "Payroll Agent",
      action: "Salary Adjustment",
      amount: "+18%",
      requester: "Payroll Agent",
      approverRole: "Manager",
      time: relativeTime(),
      status: "pending",
    },
    evidence: {
      id: evId,
      decisionId: decId,
      hash: makeHash(decId),
      timestamp: formatTimestamp(),
      agent: "Payroll Agent",
      action: "Salary Adjustment - +18%",
      policiesEvaluated: ["Payroll Adjustment Limit"],
      authorityOutcome: "Threshold Exceeded — Manager Approval Required",
      approvalOutcome: "Pending Manager Approval",
      riskClassification: "High",
      approver: "Pending — Department Manager",
      status: "PENDING",
    },
    timelineMessages: [
      { message: "Payroll Agent requested salary adjustment +18%", type: "action" },
      { message: "Payroll Adjustment Limit policy evaluation completed", type: "policy" },
      { message: `Decision intercept ${decId} triggered — authority threshold exceeded`, type: "intercept" },
      { message: "Manager approval generated", type: "approval" },
      { message: `Evidence package ${evId} created`, type: "evidence" },
      { message: "Compliance metrics updated", type: "system" },
    ],
    agentUpdates: {
      recentAction: "Salary adjustment +18% — pending approval",
      complianceStatus: "Review Required",
    },
  };
}

export type ScenarioType = "treasury" | "vendor" | "payroll" | "enterprise";

export function runScenarioStep(state: DemoState, scenario: ScenarioType): DemoState {
  let payload: ScenarioPayload;
  switch (scenario) {
    case "treasury":
      payload = buildTreasuryPayload(state);
      break;
    case "vendor":
      payload = buildVendorPayload(state);
      break;
    case "payroll":
      payload = buildPayrollPayload(state);
      break;
    case "enterprise": {
      let s = state;
      s = applyScenarioPayload(s, buildTreasuryPayload(s));
      s = applyScenarioPayload(s, buildVendorPayload(s));
      s = applyScenarioPayload(s, buildPayrollPayload(s));
      return appendTimeline(s, "Enterprise demo scenario completed — all workflows active", "system");
    }
    default:
      return state;
  }
  return applyScenarioPayload(state, payload);
}

function appendTimeline(
  state: DemoState,
  message: string,
  type: TimelineEvent["type"]
): DemoState {
  return addTimelineEvent(state, message, type).state;
}

export async function runScenarioWithDelay(
  scenario: ScenarioType,
  getState: () => DemoState,
  setState: (s: DemoState) => void,
  onStep?: (message: string) => void,
  delayMs = 900
): Promise<void> {
  if (scenario === "enterprise") {
    const steps: ScenarioType[] = ["treasury", "vendor", "payroll"];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, delayMs));
      const next = runScenarioStep(getState(), step);
      setState(next);
      onStep?.(`${step} scenario executed`);
      await new Promise((r) => setTimeout(r, delayMs / 2));
    }
    onStep?.("Enterprise scenario complete");
    return;
  }

  const payloads: Record<Exclude<ScenarioType, "enterprise">, () => ScenarioPayload> = {
    treasury: () => buildTreasuryPayload(getState()),
    vendor: () => buildVendorPayload(getState()),
    payroll: () => buildPayrollPayload(getState()),
  };

  const payload = payloads[scenario]();
  const messages = payload.timelineMessages;

  for (let i = 0; i < messages.length; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    onStep?.(messages[i].message);
    if (i === messages.length - 1) {
      setState(runScenarioStep(getState(), scenario));
    }
  }
}
