import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

interface NextStepGuidanceProps {
  message: string;
  actionLabel: string;
  actionPath: string;
}

// The reusable "What should I do next?" card every major workflow page
// ends with once its step actually completes. Never rendered
// speculatively -- callers only mount this once the real success state
// (a publish result, an extraction outcome, a resolved decision) is
// already true, so the suggested next step is always genuinely next.
export function NextStepGuidance({ message, actionLabel, actionPath }: NextStepGuidanceProps) {
  const navigate = useNavigate();

  return (
    <div
      className="mt-6 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap"
      style={{
        backgroundColor: "rgba(77,124,254,0.08)",
        border: "1px solid rgba(77,124,254,0.2)",
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--pr-authority-blue)" }}>
          What should I do next?
        </p>
        <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>{message}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate(actionPath)}
        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg flex-shrink-0"
        style={{ backgroundColor: "var(--pr-authority-blue)", color: "white" }}
      >
        {actionLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
