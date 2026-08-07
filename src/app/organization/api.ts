import { apiClient } from "../live/apiClient";
import type { LiveEvidence } from "../live/types";
import type {
  ApiKey,
  BusinessUnit,
  CreateApiKeyResult,
  CreateUserResult,
  Department,
  EnterpriseSystem,
  EnterpriseSystemType,
  HealthStatus,
  IntegrationsStatus,
  OrganizationSettings,
  OrgUser,
  Team,
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

  listEnterpriseSystems: () => apiClient.get<EnterpriseSystem[]>("/v1/enterprise-systems"),
  createEnterpriseSystem: (name: string, type: EnterpriseSystemType) =>
    apiClient.post<EnterpriseSystem>("/v1/enterprise-systems", { name, type }),
};

// Phase 5, Release 1: Organisation Structure (Business Units / Departments / Teams).
export const organizationStructureApi = {
  listBusinessUnits: () => apiClient.get<BusinessUnit[]>("/v1/business-units"),
  createBusinessUnit: (name: string) => apiClient.post<BusinessUnit>("/v1/business-units", { name }),
  updateBusinessUnit: (id: string, name: string) =>
    apiClient.patch<BusinessUnit>(`/v1/business-units/${id}`, { name }),
  deleteBusinessUnit: (id: string) => apiClient.delete<void>(`/v1/business-units/${id}`),

  listDepartments: (businessUnitId?: string) =>
    apiClient.get<Department[]>(
      `/v1/departments${businessUnitId ? `?business_unit_id=${encodeURIComponent(businessUnitId)}` : ""}`
    ),
  createDepartment: (businessUnitId: string, name: string) =>
    apiClient.post<Department>("/v1/departments", { business_unit_id: businessUnitId, name }),
  updateDepartment: (id: string, name: string) =>
    apiClient.patch<Department>(`/v1/departments/${id}`, { name }),
  deleteDepartment: (id: string) => apiClient.delete<void>(`/v1/departments/${id}`),

  listTeams: (departmentId?: string) =>
    apiClient.get<Team[]>(`/v1/teams${departmentId ? `?department_id=${encodeURIComponent(departmentId)}` : ""}`),
  createTeam: (departmentId: string, name: string) =>
    apiClient.post<Team>("/v1/teams", { department_id: departmentId, name }),
  updateTeam: (id: string, name: string) => apiClient.patch<Team>(`/v1/teams/${id}`, { name }),
  deleteTeam: (id: string) => apiClient.delete<void>(`/v1/teams/${id}`),
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
