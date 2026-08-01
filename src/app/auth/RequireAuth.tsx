import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

// Gates the entire app: every route except /login and /setup-owner
// (see routes.tsx's ProtectedLayout) renders only for a signed-in human.
// This is a UI-layer decision, separate from the Operator Key superuser
// bypass, which remains an API-level concern (verify_operator_key /
// require_permission, server side) untouched by this component -- an
// SDK or curl call with the Operator Key header still works exactly as
// before; this only controls what the browser shows a human with no
// session.
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

  // TEMPORARY (revert before the Azure migration / Demo Workspace work):
  // login wall disabled for public demonstrations. Nothing else about
  // auth changed -- a real login still works exactly as before, and
  // require_permission on the backend is completely untouched, so a
  // visitor with no session and no Operator Key still can't mutate
  // anything that requires a permission; they just aren't redirected to
  // /login to view pages that are already open to reads. Restore by
  // deleting this comment block and uncommenting the block below it.
  //
  // if (!user) {
  //   return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // }

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
