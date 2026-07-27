import { apiClient } from "../live/apiClient";
import type { CurrentUser, LoginResponse } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/v1/auth/login", { email, password }),
  logout: () => apiClient.post<void>("/v1/auth/logout"),
  me: () => apiClient.get<CurrentUser>("/v1/auth/me"),
};
