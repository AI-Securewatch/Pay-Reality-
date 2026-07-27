import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

// Guards only the new Organisation Settings / Users pages (Phase 10) --
// every pre-existing route keeps working exactly as before, ungated by
// this, since the Operator Key superuser bypass is untouched. A real
// login is required for these two pages specifically because they
// manage human identity and org-wide configuration, not runtime
// authorization, so there's no equivalent "just paste a key" path for
// them the way the rest of the product already has.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--pr-text-muted)", minHeight: "50vh" }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <div className="p-8" style={{ color: "var(--pr-text-muted)" }}>
        You don't have permission to view this page. Ask your Organisation Owner to change your role
        if you believe this is wrong.
      </div>
    );
  }
  return <>{children}</>;
}
