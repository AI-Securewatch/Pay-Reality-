import { createBrowserRouter, Navigate, useParams } from "react-router";
import { Layout } from "./components/Layout";
import { NotFound } from "./pages/NotFound";
import { RouteErrorBoundary } from "./pages/RouteErrorBoundary";
import { RequireAuth } from "./auth/RequireAuth";

// Compile/Dry Run/Deploy and Diff were merged into Publish and Versions
// respectively (PAYREALITY_UX_REVIEW.md); these keep the old URLs from
// 404ing for anyone with a bookmark or an external link.
function RedirectToPublish() {
  const { policyKey } = useParams();
  return <Navigate to={`/policy-studio/${policyKey}/publish`} replace />;
}
function RedirectToVersions() {
  const { policyKey } = useParams();
  return <Navigate to={`/policy-studio/${policyKey}/versions`} replace />;
}

// Every real page is code-split by route: the initial bundle only needs
// the shell (Layout) and whichever single page a visitor actually
// requested, instead of eagerly loading Policy Studio, both AI builders,
// and every Live page up front.
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, lazy: () => import("./pages/PlatformOverview").then((m) => ({ Component: m.PlatformOverview })) },
      // Phase 9 (AGENT_LIFECYCLE.md): the Agent Directory + Detail pages
      // replaced the earlier flat Live Agents list/register-only page.
      { path: "authority", lazy: () => import("./agents/AgentDirectoryPage").then((m) => ({ Component: m.AgentDirectoryPage })) },
      { path: "authority/:agentId", lazy: () => import("./agents/AgentDetailPage").then((m) => ({ Component: m.AgentDetailPage })) },
      { path: "decisions", lazy: () => import("./live/pages/LiveTestIntent").then((m) => ({ Component: m.LiveTestIntent })) },
      { path: "evidence", lazy: () => import("./live/pages/LiveEvidence").then((m) => ({ Component: m.LiveEvidence })) },
      { path: "assurance", lazy: () => import("./live/pages/LiveAssurance").then((m) => ({ Component: m.LiveAssurance })) },

      // Phase 10 (RBAC.md): real human login, Organisation Settings, and
      // Users management. /login is public; the other two require a
      // session (RequireAuth) -- neither gates any pre-existing route.
      { path: "login", lazy: () => import("./auth/LoginPage").then((m) => ({ Component: m.LoginPage })) },
      { path: "setup-owner", lazy: () => import("./auth/SetupOwnerPage").then((m) => ({ Component: m.SetupOwnerPage })) },
      {
        path: "organization",
        lazy: () => import("./organization/OrganizationSettingsPage").then((m) => ({
          Component: () => (
            <RequireAuth>
              <m.OrganizationSettingsPage />
            </RequireAuth>
          ),
        })),
      },
      {
        path: "organization/users",
        lazy: () => import("./organization/UsersPage").then((m) => ({
          Component: () => (
            <RequireAuth>
              <m.UsersPage />
            </RequireAuth>
          ),
        })),
      },

      // Policy Studio is the single entry point for all policy work: manual
      // authoring, the AI Authority Builder (multi-document corpus
      // analysis), the single-document AI Policy Builder it superseded as
      // the primary surface (kept mounted for backward compatibility), and
      // the legacy delegation-of-authority review flow, all nested here
      // rather than as separate top-level nav items (see PolicyListPage's
      // own entry-point links).
      { path: "policy-studio", lazy: () => import("./policy-studio/PolicyListPage").then((m) => ({ Component: m.PolicyListPage })) },
      { path: "policy-studio/review-queue", lazy: () => import("./policy-studio/ReviewQueuePage").then((m) => ({ Component: m.ReviewQueuePage })) },
      { path: "policy-studio/new", lazy: () => import("./policy-studio/PolicyWorkspacePage").then((m) => ({ Component: m.PolicyWorkspacePage })) },
      { path: "policy-studio/upload", lazy: () => import("./ai-policy-builder/UploadPage").then((m) => ({ Component: m.AIPolicyBuilderUploadPage })) },
      { path: "policy-studio/upload/:uploadId", lazy: () => import("./ai-policy-builder/ReviewPage").then((m) => ({ Component: m.AIPolicyBuilderReviewPage })) },
      { path: "policy-studio/authority-builder", lazy: () => import("./ai-authority-builder/CorpusUploadPage").then((m) => ({ Component: m.AIAuthorityBuilderUploadPage })) },
      { path: "policy-studio/authority-builder/:corpusId", lazy: () => import("./ai-authority-builder/CorpusReviewPage").then((m) => ({ Component: m.AIAuthorityBuilderCorpusReviewPage })) },
      { path: "policy-studio/legacy-review", lazy: () => import("./live/pages/LiveDocuments").then((m) => ({ Component: m.LiveDocuments })) },
      { path: "policy-studio/:policyKey", lazy: () => import("./policy-studio/PolicyWorkspacePage").then((m) => ({ Component: m.PolicyWorkspacePage })) },
      // Version History + Diff merged into one page (PAYREALITY_UX_REVIEW.md);
      // Compile + Dry Run + Deploy merged into one Publish page, same reason.
      { path: "policy-studio/:policyKey/versions", lazy: () => import("./policy-studio/VersionsPage").then((m) => ({ Component: m.VersionsPage })) },
      { path: "policy-studio/:policyKey/publish", lazy: () => import("./policy-studio/PublishPage").then((m) => ({ Component: m.PublishPage })) },
      // Old separate URLs redirect rather than 404 for anyone with a bookmark.
      { path: "policy-studio/:policyKey/diff", element: <RedirectToVersions /> },
      { path: "policy-studio/:policyKey/compile", element: <RedirectToPublish /> },
      { path: "policy-studio/:policyKey/dry-run", element: <RedirectToPublish /> },
      { path: "policy-studio/:policyKey/deploy", element: <RedirectToPublish /> },

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
      { path: "policy", element: <Navigate to="/policy-studio/legacy-review" replace /> },
      { path: "policy-library", element: <Navigate to="/policy-studio/legacy-review" replace /> },
      { path: "policy-center", element: <Navigate to="/policy-studio/legacy-review" replace /> },
      { path: "ai-policy-builder", element: <Navigate to="/policy-studio/authority-builder" replace /> },
      { path: "governance-simulation", element: <Navigate to="/decisions" replace /> },
      { path: "approvals", element: <Navigate to="/decisions" replace /> },
      { path: "assurance-center", element: <Navigate to="/assurance" replace /> },
      { path: "insurance-readiness", element: <Navigate to="/assurance" replace /> },
      { path: "settings", element: <Navigate to="/organization" replace /> },
      { path: "live", element: <Navigate to="/" replace /> },
      { path: "live/documents", element: <Navigate to="/policy-studio/legacy-review" replace /> },
      { path: "live/agents", element: <Navigate to="/authority" replace /> },
      { path: "live/test-intent", element: <Navigate to="/decisions" replace /> },
      { path: "live/evidence", element: <Navigate to="/evidence" replace /> },

      { path: "*", Component: NotFound },
    ],
  },
]);
