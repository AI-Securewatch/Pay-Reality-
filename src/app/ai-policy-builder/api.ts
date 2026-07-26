import { apiClient } from "../live/apiClient";
import type { RuntimePolicyRequest } from "../policy-studio/types";
import type { Candidate, PromoteResult, Upload } from "./types";

const BASE = "/v1/ai-policy-builder";

export const aiPolicyBuilderApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<Upload>(`${BASE}/uploads`, form);
  },
  listUploads: () => apiClient.get<Upload[]>(`${BASE}/uploads`),
  getUpload: (uploadId: string) => apiClient.get<Upload>(`${BASE}/uploads/${uploadId}`),
  listCandidatesForUpload: (uploadId: string) =>
    apiClient.get<Candidate[]>(`${BASE}/uploads/${uploadId}/candidates`),
  listCandidates: (status?: string) =>
    apiClient.get<Candidate[]>(`${BASE}/candidates${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  editCandidate: (candidateId: string, content: RuntimePolicyRequest) =>
    apiClient.put<Candidate>(`${BASE}/candidates/${candidateId}`, { content }),
  dismissCandidate: (candidateId: string) =>
    apiClient.post<Candidate>(`${BASE}/candidates/${candidateId}/dismiss`),
  promoteCandidate: (candidateId: string) =>
    apiClient.post<PromoteResult>(`${BASE}/candidates/${candidateId}/promote`),
};
