import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { AuthorityCenter } from "./pages/AuthorityCenter";
import { AIAgents } from "./pages/AIAgents";
import { DecisionIntercepts } from "./pages/DecisionIntercepts";
import { EvidenceVault } from "./pages/EvidenceVault";
import { PolicyEngine } from "./pages/PolicyEngine";
import { Approvals } from "./pages/Approvals";
import { Insurance } from "./pages/Insurance";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "authority-center", Component: AuthorityCenter },
      { path: "ai-agents", Component: AIAgents },
      { path: "decision-intercepts", Component: DecisionIntercepts },
      { path: "evidence-vault", Component: EvidenceVault },
      { path: "policy-center", Component: PolicyEngine },
      { path: "approvals", Component: Approvals },
      { path: "insurance-readiness", Component: Insurance },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
