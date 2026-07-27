export interface OrganizationSettings {
  name: string;
  logo_url: string | null;
  timezone: string;
  default_currency: string;
  default_language: string;
  settings: Record<string, unknown>;
}

export type IntegrationStatus = "connected" | "disconnected" | "configuration_required";

export interface IntegrationsStatus {
  anthropic: IntegrationStatus;
  azure_openai: IntegrationStatus;
  aws_bedrock: IntegrationStatus;
  opa: IntegrationStatus;
  postgresql: IntegrationStatus;
}

export type HealthState = "healthy" | "warning" | "offline";

export interface HealthStatus {
  runtime_authority: HealthState;
  evidence_engine: HealthState;
  opa: HealthState;
  compiler: HealthState;
  database: HealthState;
  anthropic: HealthState;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  role: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateApiKeyResult {
  api_key: ApiKey;
  raw_key: string;
}

export interface OrgUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserResult {
  user: OrgUser;
  temporary_password: string;
}
