import { useEffect, useId, useState } from "react";
import { Link, useParams } from "react-router";
import { policyStudioApi } from "./api";
import { PolicyStatusBadge } from "./components/PolicyStatusBadge";
import { CompilerDiagnosticsList } from "./components/CompilerDiagnosticsList";
import { describeApiError, describeReason, formatStatus } from "../live/format";
import { NextStepGuidance } from "../help/NextStepGuidance";
import type { CompileResult, DeployResult, DryRunResult, RuntimePolicy } from "./types";
import { Card } from "../components/ui/card";
import { FieldLabel } from "../components/ui/label";
import { Input, getInputStyle } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { ConfirmButton } from "../components/ui/confirm-button";
import { Alert } from "../components/ui/alert";

// Replaces the three separate Compile / Dry Run / Deployment pages
// (PAYREALITY_UX_REVIEW.md, "getting one rule from idea to production
// is 7 separate page navigations"). The three underlying actions are
// still real and distinct, compiling can fail, previewing is safe and
// repeatable, publishing is not, so they stay three separate steps and
// three separate API calls; what changes is that they're one page and
// one continuous read, not three destinations a user has to already
// know to visit in order.

export function PublishPage() {
  const { policyKey } = useParams();
  const formId = useId();
  const [policy, setPolicy] = useState<RuntimePolicy | null>(null);

  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [principal, setPrincipal] = useState("");
  const [action, setAction] = useState("");
  const [amount, setAmount] = useState("75000");
  const [currency, setCurrency] = useState("ZAR");
  const [advancedContext, setAdvancedContext] = useState(false);
  const [contextText, setContextText] = useState("{}");
  const [previewResult, setPreviewResult] = useState<DryRunResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [publishResult, setPublishResult] = useState<DeployResult | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  function load() {
    policyStudioApi.get(policyKey!).then((p) => {
      setPolicy(p);
      setPrincipal(p.scope.principal);
      setAction(p.scope.action);
    });
  }

  useEffect(load, [policyKey]);

  const isCompiled = policy?.status === "compiled" || policy?.status === "active";

  async function runCompile() {
    setCompiling(true);
    setCompileError(null);
    setCompileResult(null);
    try {
      const r = await policyStudioApi.compile(policyKey!);
      setCompileResult(r);
      if (r.ok) load();
    } catch (e) {
      setCompileError(describeApiError(e, "Check for errors"));
    } finally {
      setCompiling(false);
    }
  }

  async function runPreview() {
    setPreviewing(true);
    setPreviewError(null);
    setPreviewResult(null);
    let extra: Record<string, unknown> = {};
    if (advancedContext) {
      try {
        extra = contextText.trim() ? JSON.parse(contextText) : {};
      } catch {
        setPreviewError("Additional details is not valid JSON.");
        setPreviewing(false);
        return;
      }
    }
    try {
      const r = await policyStudioApi.dryRun(policyKey!, {
        principal,
        action,
        context: { amount: Number(amount), currency, ...extra },
      });
      setPreviewResult(r);
    } catch (e) {
      setPreviewError(describeApiError(e, "Preview"));
    } finally {
      setPreviewing(false);
    }
  }

  async function runPublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const r = await policyStudioApi.deploy(policyKey!);
      setPublishResult(r);
      load();
    } catch (e) {
      setPublishError(describeApiError(e, "Publish"));
    } finally {
      setPublishing(false);
    }
  }

  if (!policy) return <div className="p-8" style={{ color: "var(--pr-text-muted)" }}>Loading...</div>;

  return (
    <div className="p-8 max-w-2xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to={`/governance/${policyKey}`} style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back
      </Link>
      <div className="flex items-center gap-3 mt-2 mb-6">
        <h1 style={{ color: "var(--pr-text-primary)" }}>Publish</h1>
        <span style={{ color: "var(--pr-text-muted)" }}>{policy.name} (v{policy.version})</span>
        <PolicyStatusBadge status={policy.status} />
      </div>

      {/* Step 1: check for errors */}
      <Card style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>1. Check for errors</h2>
          {isCompiled && !compileResult && (
            <span style={{ color: "var(--pr-trust-green)", fontSize: 12 }}>Already checked</span>
          )}
        </div>
        <Button onClick={runCompile} disabled={compiling}>
          {compiling ? "Checking..." : isCompiled ? "Check again" : "Check for errors"}
        </Button>
        {compileError && <Alert severity="error" style={{ marginTop: 8 }}>{compileError}</Alert>}
        {compileResult && (
          <div className="mt-3">
            <p style={{ color: compileResult.ok ? "var(--pr-trust-green)" : "var(--pr-critical-red)", fontWeight: 600 }}>
              {compileResult.ok ? "No errors found" : "Errors found, not published"}
            </p>
            {!compileResult.ok && <CompilerDiagnosticsList errors={compileResult.errors} />}
            {compileResult.ok && (
              <Button
                variant="ghost"
                onClick={() => setShowTechnicalDetails((s) => !s)}
                style={{ fontSize: 12, marginTop: 6 }}
              >
                {showTechnicalDetails ? "Hide" : "Show"} technical details
              </Button>
            )}
            {showTechnicalDetails && (
              <div className="mt-2 text-xs" style={{ color: "var(--pr-text-disabled)", fontFamily: "monospace" }}>
                <p>Bundle ID: {compileResult.bundle_id}</p>
                <p>Bundle Hash: {compileResult.bundle_hash}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Step 2: preview */}
      <Card style={{ marginBottom: 16 }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--pr-text-primary)" }}>2. Preview</h2>
        <p style={{ color: "var(--pr-text-muted)", fontSize: 12, marginBottom: 10 }}>
          See what this rule would decide for a specific request. This never affects anything real, run it as many
          times as you like.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <FieldLabel htmlFor={`${formId}-amount`}>Amount</FieldLabel>
            <Input id={`${formId}-amount`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor={`${formId}-currency`}>Currency</FieldLabel>
            <Input id={`${formId}-currency`} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => setAdvancedContext((s) => !s)}
          style={{ fontSize: 12, marginBottom: 8 }}
        >
          {advancedContext ? "Hide" : "Add"} advanced details
        </Button>
        {advancedContext && (
          <textarea
            aria-label="Additional details (JSON)"
            style={{ ...getInputStyle(), height: 70, fontFamily: "monospace", marginBottom: 10 }}
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
          />
        )}
        <div>
          <Button onClick={runPreview} disabled={previewing}>
            {previewing ? "Previewing..." : "Preview outcome"}
          </Button>
        </div>
        {previewError && <Alert severity="error" style={{ marginTop: 8 }}>{previewError}</Alert>}
        {previewResult && (
          <div className="mt-3 text-sm" style={{ color: "var(--pr-text-primary)" }}>
            <p>Result: <strong>{formatStatus(previewResult.decision)}</strong></p>
            <p style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
              {describeReason(previewResult.review_reason ?? previewResult.deny_reason) ?? "Matched cleanly, no further reason."}
            </p>
          </div>
        )}
      </Card>

      {/* Step 3: publish */}
      <Card style={{ marginBottom: 16 }}>
        <h2 className="text-sm font-medium mb-2" style={{ color: "var(--pr-text-primary)" }}>3. Publish</h2>
        {!isCompiled && (
          <p style={{ color: "var(--pr-text-muted)", fontSize: 13, marginBottom: 12 }}>
            Check for errors first: only a rule with no errors can be published.
          </p>
        )}
        <p style={{ color: "var(--pr-warning-amber)", fontSize: 13, marginBottom: 16, maxWidth: 480 }}>
          Publishing replaces whatever rule is currently active for this principal and action, effective
          immediately for real decisions. This is not a preview.
        </p>
        <ConfirmButton variant="danger" onConfirm={runPublish} disabled={publishing || !isCompiled} confirmLabel="Publish">
          {publishing ? "Publishing..." : "Publish"}
        </ConfirmButton>
        {publishError && <Alert severity="error" style={{ marginTop: 8 }}>{publishError}</Alert>}
        {publishResult && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "var(--pr-trust-green)", fontWeight: 600 }}>
              Published at {new Date(publishResult.deployed_at).toLocaleString()}.
            </p>
            {publishResult.mandate_id ? (
              <div
                className="mt-2 p-3"
                style={{ borderLeft: "3px solid var(--pr-authority-blue)", backgroundColor: "var(--pr-overlay-04)", borderRadius: 6 }}
              >
                <p style={{ color: "var(--pr-authority-blue)", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Authority-backed</p>
                <p style={{ color: "var(--pr-text-primary)", fontSize: 13, fontFamily: "monospace" }}>
                  Mandate {publishResult.mandate_id} (Authority {publishResult.authority_id})
                </p>
              </div>
            ) : (
              <p style={{ color: "var(--pr-text-muted)", fontSize: 13, marginTop: 4 }}>
                No Authority resolved for this policy.
              </p>
            )}
          </div>
        )}
      </Card>

      {publishResult && (
        <NextStepGuidance
          message="This rule is now active and governing real agent actions. Register an agent so there's something for it to actually apply to."
          actionLabel="Register an Agent"
          actionPath="/agents"
        />
      )}
    </div>
  );
}
