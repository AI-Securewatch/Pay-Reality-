import { apiClient } from "../live/apiClient";
import type { LiveEvidence } from "../live/types";
import type {
  ApiKey,
  CreateApiKeyResult,
  CreateUserResult,
  HealthStatus,
  IntegrationsStatus,
  OrganizationSettings,
  OrgUser,
} from "./types";

export const organizationApi = {
  getSettings: () => apiClient.get<OrganizationSettings>("/v1/organization/settings"),
  updateSettings: (body: Partial<OrganizationSettings>) =>
    apiClient.patch<OrganizationSettings>("/v1/organization/settings", body),
  getIntegrations: () => apiClient.get<IntegrationsStatus>("/v1/organization/integrations"),
  getHealth: () => apiClient.get<HealthStatus>("/v1/organization/health"),
  exportEvidence: () => apiClient.get<LiveEvidence[]>("/v1/organization/exports/evidence"),

  listApiKeys: () => apiClient.get<ApiKey[]>("/v1/organization/api-keys"),
  createApiKey: (name: string, role: string) =>
    apiClient.post<CreateApiKeyResult>("/v1/organization/api-keys", { name, role }),
  revokeApiKey: (id: string) => apiClient.delete<void>(`/v1/organization/api-keys/${id}`),
};

export const usersApi = {
  list: () => apiClient.get<OrgUser[]>("/v1/users"),
  create: (email: string, name: string, role: string) =>
    apiClient.post<CreateUserResult>("/v1/users", { email, name, role }),
  updateRole: (userId: string, role: string) =>
    apiClient.patch<OrgUser>(`/v1/users/${userId}/role`, { role }),
  updateStatus: (userId: string, status: string) =>
    apiClient.patch<OrgUser>(`/v1/users/${userId}/status`, { status }),
};
