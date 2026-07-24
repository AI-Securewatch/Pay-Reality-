import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { PlatformOverview } from "./pages/PlatformOverview";
import { NotFound } from "./pages/NotFound";
import { LiveAgents } from "./live/pages/LiveAgents";
import { LiveDocuments } from "./live/pages/LiveDocuments";
import { LiveTestIntent } from "./live/pages/LiveTestIntent";
import { LiveEvidence } from "./live/pages/LiveEvidence";
import { LiveAssurance } from "./live/pages/LiveAssurance";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: PlatformOverview },
      { path: "authority", Component: LiveAgents },
      { path: "policy", Component: LiveDocuments },
      { path: "decisions", Component: LiveTestIntent },
      { path: "evidence", Component: LiveEvidence },
      { path: "assurance", Component: LiveAssurance },

      // Legacy paths from the pre-consolidation app, kept as redirects so
      // no external link or bookmark 404s. See audit/EXECUTION_REPORT.md.
      { path: "platform-overview", element: <Navigate to="/" replace /> },
      { path: "command-center", element: <Navigate to="/assurance" replace /> },
      { path: "dashboard", element: <Navigate to="/assurance" replace /> },
      { path: "authority-center", element: <Navigate to="/authority" replace /> },
      { path: "ai-agents-registry", element: <Navigate to="/authority" replace /> },
      { path: "ai-agents", element: <Navigate to="/authority" replace /> },
      { path: "decision-intercepts", element: <Navigate to="/decisions" replace /> },
      { path: "evidence-vault", element: <Navigate to="/evidence" replace /> },
      { path: "policy-library", element: <Navigate to="/policy" replace /> },
      { path: "policy-center", element: <Navigate to="/policy" replace /> },
      { path: "governance-simulation", element: <Navigate to="/decisions" replace /> },
      { path: "approvals", element: <Navigate to="/decisions" replace /> },
      { path: "assurance-center", element: <Navigate to="/assurance" replace /> },
      { path: "insurance-readiness", element: <Navigate to="/assurance" replace /> },
      { path: "settings", element: <Navigate to="/" replace /> },
      { path: "live", element: <Navigate to="/" replace /> },
      { path: "live/documents", element: <Navigate to="/policy" replace /> },
      { path: "live/agents", element: <Navigate to="/authority" replace /> },
      { path: "live/test-intent", element: <Navigate to="/decisions" replace /> },
      { path: "live/evidence", element: <Navigate to="/evidence" replace /> },

      { path: "*", Component: NotFound },
    ],
  },
]);
