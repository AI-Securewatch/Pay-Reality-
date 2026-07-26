import { apiClient } from "../live/apiClient";
import type { LiveAgent, LivePrincipal } from "../live/types";
import type {
  AgentDetail,
  AgentListPage,
  AuditEvent,
  BulkActionResult,
  Certificate,
} from "./types";

const BASE = "/v1/agents";

export interface AgentFilters {
  status?: string;
  environment?: string;
  owner?: string;
  principal_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function query(filters: AgentFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const agentsApi = {
  list: (filters: AgentFilters = {}) => apiClient.get<AgentListPage>(`${BASE}${query(filters)}`),
  listPrincipals: () => apiClient.get<LivePrincipal[]>("/v1/principals"),
  createPrincipal: (name: string) => apiClient.post<LivePrincipal>("/v1/principals", { name }),
  register: (body: { name: string; acting_for_principal_id: string; public_key: string; owner?: string; description?: string }) =>
    apiClient.post<LiveAgent>(BASE, body),
  getDetail: (agentId: string) => apiClient.get<AgentDetail>(`${BASE}/${agentId}`),
  update: (agentId: string, body: Partial<{
    description: string; purpose: string; model: string; version: string;
    runtime: string; platform: string; environment: string; tags: string[]; labels: string[];
  }>) => apiClient.patch<LiveAgent>(`${BASE}/${agentId}`, body),
  activate: (agentId: string, reason?: string) =>
    apiClient.post<LiveAgent>(`${BASE}/${agentId}/activate`, { reason }),
  suspend: (agentId: string, reason?: string) =>
    apiClient.post<LiveAgent>(`${BASE}/${agentId}/suspend`, { reason }),
  retire: (agentId: string, reason?: string) =>
    apiClient.post<LiveAgent>(`${BASE}/${agentId}/retire`, { reason }),
  revoke: (agentId: string, reason?: string) =>
    apiClient.post<LiveAgent>(`${BASE}/${agentId}/revoke`, { reason }),
  rotate: (agentId: string, newPublicKey: string) =>
    apiClient.post<Certificate>(`${BASE}/${agentId}/rotate`, { new_public_key: newPublicKey }),
  transfer: (agentId: string, newOwner: string, newBusinessUnit?: string) =>
    apiClient.post<LiveAgent>(`${BASE}/${agentId}/transfer`, {
      new_owner: newOwner, new_business_unit: newBusinessUnit,
    }),
  listCertificates: (agentId: string) => apiClient.get<Certificate[]>(`${BASE}/${agentId}/certificates`),
  listAuditEvents: (agentId: string) => apiClient.get<AuditEvent[]>(`${BASE}/${agentId}/audit`),
  verifyAuditEvent: (agentId: string, eventId: string) =>
    apiClient.post<{ valid: boolean }>(`${BASE}/${agentId}/audit/${eventId}/verify`),
  bulkSuspend: (agentIds: string[], reason?: string) =>
    apiClient.post<BulkActionResult>(`${BASE}/bulk/suspend`, { agent_ids: agentIds, reason }),
  bulkActivate: (agentIds: string[]) =>
    apiClient.post<BulkActionResult>(`${BASE}/bulk/activate`, { agent_ids: agentIds }),
  bulkRetire: (agentIds: string[], reason?: string) =>
    apiClient.post<BulkActionResult>(`${BASE}/bulk/retire`, { agent_ids: agentIds, reason }),
  bulkRequestRotation: (agentIds: string[]) =>
    apiClient.post<BulkActionResult>(`${BASE}/bulk/rotate`, { agent_ids: agentIds }),
};
