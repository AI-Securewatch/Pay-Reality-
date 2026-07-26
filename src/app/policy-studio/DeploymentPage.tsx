import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { DeployResult, RuntimePolicy } from "./types";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";
import { ApiError } from "../live/apiClient";

export function DeploymentPage() {
  const { policyKey } = useParams();
  const [policy, setPolicy] = useState<RuntimePolicy | null>(null);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    policyStudioApi.get(policyKey!).then(setPolicy);
  }, [policyKey]);

  async function handleDeploy() {
    setRunning(true);
    setError(null);
    try {
      const r = await policyStudioApi.deploy(policyKey!);
      setResult(r);
      const updated = await policyStudioApi.get(policyKey!);
      setPolicy(updated);
    } catch (e) {
      setError(e instanceof ApiError ? `Deploy failed: ${JSON.stringify(e.body)}` : "Deploy failed.");
    } finally {
      setRunning(false);
    }
  }

  const canDeploy = policy?.status === "compiled";

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <h1 className="mt-2 mb-2" style={{ color: "var(--pr-text-primary)" }}>Deployment</h1>

      {policy && (
        <div className="flex items-center gap-2 mb-6">
          <span style={{ color: "var(--pr-text-primary)" }}>{policy.name} (v{policy.version})</span>
          <PolicyStatusBadge status={policy.status} />
        </div>
      )}

      {policy && !canDeploy && (
        <p style={{ color: "var(--pr-text-disabled)", fontSize: 13, marginBottom: 16 }}>
          Only a policy in the Compiled status can be deployed. Compile this version first.
        </p>
      )}

      {policy && (
        <div
          style={{
            backgroundColor: "var(--pr-bg-card)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>Bundle ID: {policy.bundle_id ?? "N/A"}</p>
          <p style={{ fontSize: 13, color: "var(--pr-text-secondary)" }}>Bundle Hash: {policy.bundle_hash ?? "N/A"}</p>
        </div>
      )}

      <p style={{ color: "var(--pr-warning-amber)", fontSize: 13, marginBottom: 16, maxWidth: 480 }}>
        Deploying replaces whatever policy is currently active for this principal and action, and takes
        effect immediately for real Intent evaluation. This is not a simulation.
      </p>

      <button
        onClick={handleDeploy}
        disabled={running || !canDeploy}
        className="px-4 py-2 rounded-lg text-sm font-medium mb-6"
        style={{
          backgroundColor: canDeploy ? "var(--pr-critical-red)" : "var(--pr-bg-hover)",
          color: canDeploy ? "#fff" : "var(--pr-text-disabled)",
        }}
      >
        {running ? "Deploying..." : "Deploy to Production"}
      </button>

      {error && <p style={{ color: "var(--pr-critical-red)" }}>{error}</p>}

      {result && (
        <div
          style={{
            backgroundColor: "var(--pr-bg-card)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <p style={{ color: "var(--pr-trust-green)", fontWeight: 600 }}>DEPLOYED</p>
          <div className="mt-3 text-sm" style={{ color: "var(--pr-text-secondary)" }}>
            <p>Bundle ID: {result.bundle_id}</p>
            <p>Bundle Hash: {result.bundle_hash}</p>
            <p>Deployment Time: {new Date(result.deployed_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
