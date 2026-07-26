import { apiClient } from "../live/apiClient";
import type { LivePrincipal } from "../live/types";
import type {
  CompileResult,
  DeployResult,
  DryRunResult,
  PolicyDiff,
  RuntimePolicy,
  RuntimePolicyRequest,
} from "./types";

const BASE = "/v1/runtime-policies";

export const policyStudioApi = {
  getVocabulary: () => apiClient.get<{ actions: string[] }>(`${BASE}/vocabulary`),
  // A rule's Scope.principal used to be a free-text field the author had
  // to type an exact ID into by hand (PAYREALITY_UX_REVIEW.md, usability
  // problem #6). Reuses the same /v1/principals list the Agent Directory
  // already shows, so the picker always reflects real principals.
  listPrincipals: () => apiClient.get<LivePrincipal[]>("/v1/principals"),
  list: (status?: string) =>
    apiClient.get<RuntimePolicy[]>(`${BASE}${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  get: (policyKey: string) => apiClient.get<RuntimePolicy>(`${BASE}/${policyKey}`),
  getVersions: (policyKey: string) => apiClient.get<RuntimePolicy[]>(`${BASE}/${policyKey}/versions`),
  getVersion: (policyKey: string, version: number) =>
    apiClient.get<RuntimePolicy>(`${BASE}/${policyKey}/versions/${version}`),
  create: (body: RuntimePolicyRequest) => apiClient.post<RuntimePolicy>(BASE, body),
  edit: (policyKey: string, body: RuntimePolicyRequest) =>
    apiClient.put<RuntimePolicy>(`${BASE}/${policyKey}`, body),
  submitForReview: (policyKey: string) =>
    apiClient.post<RuntimePolicy>(`${BASE}/${policyKey}/submit-for-review`),
  approve: (policyKey: string, approver: string) =>
    apiClient.post<RuntimePolicy>(`${BASE}/${policyKey}/approve`, { approver }),
  reject: (policyKey: string, reviewer: string, reason: string) =>
    apiClient.post<RuntimePolicy>(`${BASE}/${policyKey}/reject`, { reviewer, reason }),
  compile: (policyKey: string) => apiClient.post<CompileResult>(`${BASE}/${policyKey}/compile`),
  dryRun: (
    policyKey: string,
    body: { principal: string; action: string; resource?: string; context: Record<string, unknown> }
  ) => apiClient.post<DryRunResult>(`${BASE}/${policyKey}/dry-run`, body),
  deploy: (policyKey: string) => apiClient.post<DeployResult>(`${BASE}/${policyKey}/deploy`),
  diff: (policyKey: string, fromVersion: number, toVersion: number) =>
    apiClient.get<PolicyDiff>(`${BASE}/${policyKey}/diff?from_version=${fromVersion}&to_version=${toVersion}`),
};
