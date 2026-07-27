import { apiClient } from "../live/apiClient";
import type { CurrentUser, LoginResponse } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/v1/auth/login", { email, password }),
  logout: () => apiClient.post<void>("/v1/auth/logout"),
  me: () => apiClient.get<CurrentUser>("/v1/auth/me"),
  // Uses the Operator Key directly as this one request's credential
  // (not necessarily whatever's already saved in the sidebar) -- see
  // SetupOwnerPage.tsx for why this exists.
  setupOwner: (email: string, password: string, operatorKey: string) =>
    apiClient.post<CurrentUser>(
      "/v1/auth/setup-owner",
      { email, password },
      { headers: { "X-PayReality-Operator-Key": operatorKey } },
    ),
};
