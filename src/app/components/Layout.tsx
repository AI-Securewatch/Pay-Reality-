import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Shield,
  Bot,
  GitBranch,
  Database,
  FileCode,
  CheckCircle,
  Building2,
  Settings as SettingsIcon,
  Activity,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Authority",
    items: [
      { path: "/ai-agents", label: "AI Agents", icon: Bot },
      { path: "/authority-center", label: "Authority Center", icon: Shield },
    ],
  },
  {
    label: "Governance",
    items: [
      { path: "/policy-center", label: "Policy Center", icon: FileCode },
      { path: "/decision-intercepts", label: "Decision Intercepts", icon: GitBranch },
      { path: "/approvals", label: "Approvals", icon: CheckCircle },
    ],
  },
  {
    label: "Evidence",
    items: [
      { path: "/evidence-vault", label: "Evidence Vault", icon: Database },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { path: "/insurance-readiness", label: "Insurance Readiness", icon: Building2 },
    ],
  },
];

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: "var(--pr-bg-primary)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col border-r"
        style={{
          backgroundColor: "var(--pr-bg-secondary)",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--pr-authority-blue) 0%, #7C3AED 100%)",
              }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1
                className="text-sm font-semibold leading-none mb-0.5"
                style={{ color: "var(--pr-text-primary)" }}
              >
                Pay<span style={{ color: "var(--pr-warning-amber)" }}>Reality</span>
              </h1>
              <p className="text-[10px] leading-none" style={{ color: "var(--pr-text-disabled)" }}>
                AI Authority Layer
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "none" }}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p
                className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--pr-text-disabled)" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-100 group relative"
                      style={{
                        backgroundColor: active ? "rgba(77,124,254,0.12)" : "transparent",
                        color: active ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                          style={{ backgroundColor: "var(--pr-authority-blue)" }}
                        />
                      )}
                      <Icon
                        className="w-4 h-4 flex-shrink-0 transition-all"
                        style={{
                          color: active ? "var(--pr-authority-blue)" : "var(--pr-text-disabled)",
                        }}
                      />
                      <span
                        className="text-[13px] font-medium truncate flex-1"
                        style={{
                          color: active ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {/* Settings Link */}
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all mb-3"
            style={{
              backgroundColor: isActive("/settings") ? "rgba(77,124,254,0.12)" : "transparent",
              color: isActive("/settings") ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/settings")) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              if (!isActive("/settings")) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <SettingsIcon
              className="w-4 h-4"
              style={{ color: isActive("/settings") ? "var(--pr-authority-blue)" : "var(--pr-text-disabled)" }}
            />
            <span className="text-[13px] font-medium">Settings</span>
          </Link>

          {/* System Status */}
          <div
            className="px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3" style={{ color: "var(--pr-trust-green)" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--pr-text-secondary)" }}>
                  System Status
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--pr-trust-green)" }}
                />
                <span className="text-[10px]" style={{ color: "var(--pr-trust-green)" }}>
                  Operational
                </span>
              </div>
            </div>
            <p className="text-[10px]" style={{ color: "var(--pr-text-disabled)" }}>
              All 6 agents verified · v2.4.1
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
