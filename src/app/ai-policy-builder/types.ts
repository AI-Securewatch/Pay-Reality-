// AI Policy Builder-specific types. Candidate content reuses Policy
// Studio's own RuntimePolicyRequest shape by import (RUNTIME_POLICY_MAPPING.md):
// a candidate's content is literally what a human would post to
// POST /v1/runtime-policies, so editing it can reuse Policy Studio's own
// ConditionRow/ScopeFields components unmodified.

import type { RuntimePolicyRequest } from "../policy-studio/types";

export type UploadFormat = "pdf" | "docx" | "xlsx" | "csv" | "text";
export type UploadStatus = "uploaded" | "extracted" | "failed";
export type CandidateStatus = "pending_review" | "promoted" | "dismissed";

export interface Upload {
  upload_id: string;
  filename: string;
  format: UploadFormat;
  status: UploadStatus;
  error: string | null;
  uploaded_at: string;
}

export interface Candidate {
  candidate_id: string;
  upload_id: string;
  content: RuntimePolicyRequest;
  confidence: number;
  missing_fields: string[];
  source_excerpt: string | null;
  source_location: string | null;
  status: CandidateStatus;
  promoted_policy_key: string | null;
  created_at: string;
}

export interface ValidationErrorItem {
  field: string;
  code: string;
  message: string;
}

export interface PromoteResult {
  policy_key: string;
  version: number;
  status: string;
}
