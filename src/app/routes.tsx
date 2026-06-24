import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { PlatformOverview } from "./pages/PlatformOverview";
import { Dashboard } from "./pages/Dashboard";
import { AuthorityCenter } from "./pages/AuthorityCenter";
import { AIAgents } from "./pages/AIAgents";
import { DecisionIntercepts } from "./pages/DecisionIntercepts";
import { EvidenceVault } from "./pages/EvidenceVault";
import { PolicyEngine } from "./pages/PolicyEngine";
import { GovernanceSimulation } from "./pages/GovernanceSimulation";
import { Approvals } from "./pages/Approvals";
import { Insurance } from "./pages/Insurance";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: PlatformOverview },
      { path: "platform-overview", element: <Navigate to="/" replace /> },
      { path: "command-center", Component: Dashboard },
      { path: "dashboard", element: <Navigate to="/command-center" replace /> },
      { path: "authority-center", Component: AuthorityCenter },
      { path: "ai-agents-registry", Component: AIAgents },
      { path: "ai-agents", element: <Navigate to="/ai-agents-registry" replace /> },
      { path: "decision-intercepts", Component: DecisionIntercepts },
      { path: "evidence-vault", Component: EvidenceVault },
      { path: "policy-library", Component: PolicyEngine },
      { path: "policy-center", element: <Navigate to="/policy-library" replace /> },
      { path: "governance-simulation", Component: GovernanceSimulation },
      { path: "approvals", Component: Approvals },
      { path: "assurance-center", Component: Insurance },
      { path: "insurance-readiness", element: <Navigate to="/assurance-center" replace /> },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
