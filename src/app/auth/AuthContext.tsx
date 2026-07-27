import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "./authApi";
import { clearSessionToken, getSessionToken, setSessionToken } from "../live/sessionToken";
import type { CurrentUser } from "./types";

interface AuthContextValue {
  user: CurrentUser | null;
  // Undetermined yet (checking an existing session token on first load),
  // distinct from "checked, and there is no user" -- RequireAuth needs
  // this distinction to avoid a login-page flash on every page load.
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSessionToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearSessionToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    setSessionToken(response.token);
    setUser(response.user);
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      clearSessionToken();
      setUser(null);
    }
  }

  function hasPermission(permission: string): boolean {
    return user?.permissions.includes(permission) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
