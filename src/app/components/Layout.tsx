import { useEffect, useState } from "react";
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
  Compass,
  Menu,
  Radio,
  FileCheck,
  FlaskConical,
} from "lucide-react";
import { DemoProvider, useDemo } from "../demo/DemoContext";
import { NotificationProvider } from "./NotificationProvider";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { useIsMobile } from "./ui/use-mobile";

const navGroups = [
  {
    label: "Overview",
    items: [
      { path: "/", label: "Platform Overview", icon: Compass },
      { path: "/command-center", label: "AI Authority Command Center", icon: LayoutDashboard },
    ],
  },
  {
    label: "Authority",
    items: [
      { path: "/ai-agents-registry", label: "AI Agents Registry", icon: Bot },
      { path: "/authority-center", label: "Authority Center", icon: Shield },
    ],
  },
  {
    label: "Governance",
    items: [
      { path: "/policy-library", label: "Policy Library", icon: FileCode },
      { path: "/governance-simulation", label: "Governance Simulation", icon: Activity },
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
    label: "Assurance",
    items: [
      { path: "/assurance-center", label: "Assurance Center", icon: Building2 },
    ],
  },
  {
    label: "Live",
    items: [
      { path: "/live", label: "Live Overview", icon: Radio },
      { path: "/live/documents", label: "Documents & Review", icon: FileCheck },
      { path: "/live/agents", label: "Live Agents", icon: Bot },
      { path: "/live/test-intent", label: "Test a Decision", icon: FlaskConical },
      { path: "/live/evidence", label: "Live Evidence", icon: Database },
    ],
  },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { state } = useDemo();
  const pendingCount = state.approvals.filter((a) => a.status === "pending").length;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/command-center") return location.pathname === "/command-center" || location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <>
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
                    onClick={onNavigate}
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
                    {item.path === "/approvals" && pendingCount > 0 && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(245,158,11,0.15)",
                          color: "var(--pr-warning-amber)",
                        }}
                      >
                        {pendingCount}
                      </span>
                    )}
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
          onClick={onNavigate}
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
            All {state.agents.filter((a) => a.status === "Active").length} agents verified · v2.4.1
          </p>
        </div>
      </div>
    </>
  );
}

function LayoutInner() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: "var(--pr-bg-primary)" }}
    >
      {/* Sidebar (desktop) */}
      {!isMobile && (
        <aside
          className="w-[220px] flex-shrink-0 flex flex-col border-r"
          style={{
            backgroundColor: "var(--pr-bg-secondary)",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <SidebarBody />
        </aside>
      )}

      {/* Sidebar (mobile drawer) */}
      {isMobile && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="left"
            className="w-[260px] max-w-[80vw] flex flex-col p-0 gap-0 border-r"
            style={{
              backgroundColor: "var(--pr-bg-secondary)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        {isMobile && (
          <header
            className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{
              backgroundColor: "var(--pr-bg-secondary)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="p-2 -ml-2 rounded-lg"
              style={{ color: "var(--pr-text-primary)" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--pr-authority-blue) 0%, #7C3AED 100%)",
              }}
            >
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-semibold" style={{ color: "var(--pr-text-primary)" }}>
              Pay<span style={{ color: "var(--pr-warning-amber)" }}>Reality</span>
            </h1>
          </header>
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Layout() {
  return (
    <NotificationProvider>
      <DemoProvider>
        <LayoutInner />
      </DemoProvider>
    </NotificationProvider>
  );
}
