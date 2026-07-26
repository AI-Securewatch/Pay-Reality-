import { useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import type { CompileResult } from "./types";
import { CompilerDiagnosticsList } from "./components/CompilerDiagnosticsList";
import { ApiError } from "../live/apiClient";

export function CompilePage() {
  const { policyKey } = useParams();
  const [result, setResult] = useState<CompileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runCompile() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await policyStudioApi.compile(policyKey!);
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? `Compile failed: ${JSON.stringify(e.body)}` : "Compile failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/policy-studio/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <h1 className="mt-2 mb-6" style={{ color: "var(--pr-text-primary)" }}>Compile</h1>

      <button
        onClick={runCompile}
        disabled={running}
        className="px-4 py-2 rounded-lg text-sm font-medium mb-6"
        style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
      >
        {running ? "Compiling..." : "Run Compile"}
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
          <p style={{ color: result.ok ? "var(--pr-trust-green)" : "var(--pr-critical-red)", fontWeight: 600 }}>
            {result.ok ? "SUCCESS" : `ERRORS, not compiled`}
          </p>
          {result.ok ? (
            <div className="mt-3 text-sm" style={{ color: "var(--pr-text-secondary)" }}>
              <p>Bundle ID: {result.bundle_id}</p>
              <p>Bundle Hash: {result.bundle_hash}</p>
              <Link to={`/policy-studio/${policyKey}/dry-run`} style={{ color: "var(--pr-authority-blue)" }}>
                Continue to Dry Run
              </Link>
            </div>
          ) : (
            <CompilerDiagnosticsList errors={result.errors} />
          )}
        </div>
      )}
    </div>
  );
}
