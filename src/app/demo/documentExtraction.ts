import type { Policy } from "./demoTypes";

export type DocumentType =
  | "delegation"
  | "treasury"
  | "procurement"
  | "payroll"
  | "generic";

export function detectDocumentType(fileName: string): DocumentType {
  const lower = fileName.toLowerCase();
  if (lower.includes("delegation") || lower.includes("authority")) return "delegation";
  if (lower.includes("treasury")) return "treasury";
  if (lower.includes("procurement")) return "procurement";
  if (lower.includes("payroll")) return "payroll";
  return "generic";
}

export const PROCESSING_STAGES = [
  { label: "Document Processing", sub: "Extracting content" },
  { label: "Control Discovery", sub: "Identifying governance controls" },
  { label: "Authority Detection", sub: "Finding delegated authority structures" },
  { label: "Policy Translation", sub: "Converting controls into policies" },
  { label: "Evidence Mapping", sub: "Determining required evidence" },
  { label: "Validation", sub: "Detecting ambiguities and conflicts" },
  { label: "Governance Coverage Generation", sub: "Calculating organizational coverage" },
];

const EXTRACTION_MAP: Record<DocumentType, Omit<Policy, "id">[]> = {
  delegation: [
    {
      name: "CFO Approval Threshold",
      rule: "IF Transfer > $100,000 THEN Require CFO Approval + Generate Evidence",
      active: true,
      triggered: 0,
      agents: ["Treasury Agent", "Finance Agent"],
      category: "Financial Controls",
      lastModified: "Just now",
      confidence: 97,
      source: "document",
      thresholdAmount: 100000,
      requiredApprover: "CFO",
    },
    {
      name: "CEO Dual Sign-Off",
      rule: "IF Transfer > $250,000 THEN Require CEO + CFO Dual Approval",
      active: true,
      triggered: 0,
      agents: ["Treasury Agent"],
      category: "Financial Controls",
      lastModified: "Just now",
      confidence: 96,
      source: "document",
      thresholdAmount: 250000,
      requiredApprover: "CEO, CFO",
    },
  ],
  treasury: [
    {
      name: "Treasury Wire Transfer Control",
      rule: "IF Wire Transfer > $100,000 THEN Require CFO Approval Before Execution",
      active: true,
      triggered: 0,
      agents: ["Treasury Agent"],
      category: "Financial Controls",
      lastModified: "Just now",
      confidence: 98,
      source: "document",
      thresholdAmount: 100000,
      requiredApprover: "CFO",
    },
    {
      name: "Critical Transfer Escalation",
      rule: "IF Wire Transfer > $250,000 THEN Escalate to CEO + Block Until Approved",
      active: true,
      triggered: 0,
      agents: ["Treasury Agent"],
      category: "Compliance",
      lastModified: "Just now",
      confidence: 99,
      source: "document",
      thresholdAmount: 250000,
      requiredApprover: "CEO",
    },
  ],
  procurement: [
    {
      name: "Vendor KYC Requirement",
      rule: "IF Vendor Onboarding THEN Require KYC Verification + Procurement Review",
      active: true,
      triggered: 0,
      agents: ["Procurement Agent", "Vendor Approval Agent"],
      category: "Vendor Controls",
      lastModified: "Just now",
      confidence: 99,
      source: "document",
      requiredApprover: "Procurement Director",
    },
    {
      name: "New Vendor Evidence Mandate",
      rule: "IF New Vendor Created THEN Generate Evidence Package + Compliance Record",
      active: true,
      triggered: 0,
      agents: ["Procurement Agent"],
      category: "Evidence Controls",
      lastModified: "Just now",
      confidence: 95,
      source: "document",
    },
  ],
  payroll: [
    {
      name: "Salary Increase Approval",
      rule: "IF Salary Increase > 15% THEN Require Manager Approval + HR Sign-Off",
      active: true,
      triggered: 0,
      agents: ["Payroll Agent"],
      category: "Payroll Controls",
      lastModified: "Just now",
      confidence: 97,
      source: "document",
      requiredApprover: "Manager",
    },
    {
      name: "Payroll Batch Governance",
      rule: "IF Payroll Batch > $500,000 THEN Require CFO Approval + Audit Trail",
      active: true,
      triggered: 0,
      agents: ["Payroll Agent"],
      category: "Financial Controls",
      lastModified: "Just now",
      confidence: 96,
      source: "document",
      thresholdAmount: 500000,
      requiredApprover: "CFO",
    },
  ],
  generic: [
    {
      name: "Extracted Governance Control",
      rule: "IF High-Risk AI Action THEN Require Human Approval + Evidence Generation",
      active: true,
      triggered: 0,
      agents: ["Finance Agent", "Treasury Agent"],
      category: "Risk Controls",
      lastModified: "Just now",
      confidence: 90,
      source: "document",
    },
  ],
};

export function extractPoliciesFromDocuments(fileNames: string[]): Policy[] {
  const seen = new Set<string>();
  const policies: Policy[] = [];
  let idx = 0;

  for (const name of fileNames) {
    const docType = detectDocumentType(name);
    const templates = EXTRACTION_MAP[docType];
    for (const template of templates) {
      const key = template.rule;
      if (seen.has(key)) continue;
      seen.add(key);
      policies.push({
        ...template,
        id: `doc-p-${Date.now()}-${idx++}`,
      });
    }
  }

  return policies;
}

export function getExtractedControlSummary(fileNames: string[]): {
  policiesFound: number;
  authorityRules: number;
  approvalChains: number;
  evidenceRequirements: number;
} {
  const policies = extractPoliciesFromDocuments(fileNames);
  return {
    policiesFound: policies.length,
    authorityRules: policies.filter((p) => p.requiredApprover).length,
    approvalChains: policies.filter((p) => p.thresholdAmount).length + 2,
    evidenceRequirements: policies.filter((p) => p.category.includes("Evidence")).length + 3,
  };
}
