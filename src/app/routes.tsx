import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { PlatformOverview } from "./pages/PlatformOverview";
import { NotFound } from "./pages/NotFound";
import { LiveAgents } from "./live/pages/LiveAgents";
import { LiveDocuments } from "./live/pages/LiveDocuments";
import { LiveTestIntent } from "./live/pages/LiveTestIntent";
import { LiveEvidence } from "./live/pages/LiveEvidence";
import { LiveAssurance } from "./live/pages/LiveAssurance";
import { PolicyListPage } from "./policy-studio/PolicyListPage";
import { PolicyWorkspacePage } from "./policy-studio/PolicyWorkspacePage";
import { CompilePage } from "./policy-studio/CompilePage";
import { DryRunPage } from "./policy-studio/DryRunPage";
import { VersionHistoryPage } from "./policy-studio/VersionHistoryPage";
import { PolicyDiffPage } from "./policy-studio/PolicyDiffPage";
import { ReviewQueuePage } from "./policy-studio/ReviewQueuePage";
import { DeploymentPage } from "./policy-studio/DeploymentPage";
import { AIPolicyBuilderUploadPage } from "./ai-policy-builder/UploadPage";
import { AIPolicyBuilderReviewPage } from "./ai-policy-builder/ReviewPage";

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

      { path: "policy-studio", Component: PolicyListPage },
      { path: "policy-studio/review-queue", Component: ReviewQueuePage },
      { path: "policy-studio/new", Component: PolicyWorkspacePage },
      { path: "policy-studio/:policyKey", Component: PolicyWorkspacePage },
      { path: "policy-studio/:policyKey/versions", Component: VersionHistoryPage },
      { path: "policy-studio/:policyKey/diff", Component: PolicyDiffPage },
      { path: "policy-studio/:policyKey/compile", Component: CompilePage },
      { path: "policy-studio/:policyKey/dry-run", Component: DryRunPage },
      { path: "policy-studio/:policyKey/deploy", Component: DeploymentPage },

      { path: "ai-policy-builder", Component: AIPolicyBuilderUploadPage },
      { path: "ai-policy-builder/uploads/:uploadId", Component: AIPolicyBuilderReviewPage },

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
