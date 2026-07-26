import { useEffect, useState } from "react";
import { CheckCircle2, Database, ShieldCheck, ShieldX } from "lucide-react";
import { apiClient } from "../apiClient";
import { formatStatus } from "../format";
import type { LiveEvidence as LiveEvidenceType } from "../types";

export function LiveEvidence() {
  const [records, setRecords] = useState<LiveEvidenceType[] | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiClient.get<LiveEvidenceType[]>("/v1/evidence").then(setRecords);
  }, []);

  const verify = async (id: string) => {
    const result = await apiClient.post<{ valid: boolean }>(`/v1/evidence/${id}/verify`);
    setVerifyResults((prev) => ({ ...prev, [id]: result.valid }));
  };

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
            Live Evidence Vault
          </span>
        </div>
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Live Evidence</h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Every decision produces a cryptographically signed, immutable Evidence record. Verify a
          signature to detect any tampering.
        </p>
      </div>

      <div className="space-y-3">
        {records?.length === 0 && (
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            No evidence yet. Submit an Intent from the Test a Decision page.
          </p>
        )}
        {records?.map((e) => {
          const verified = verifyResults[e.evidence_id];
          return (
            <div
              key={e.evidence_id}
              className="p-5 rounded-xl border"
              style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-mono" style={{ color: "var(--pr-authority-blue)" }}>{e.evidence_id}</p>
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                    {new Date(e.created_at).toLocaleString()} · key {e.key_id}
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: e.status === "VERIFIED" ? "rgba(34,197,94,0.1)" : e.status === "REJECTED" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    color: e.status === "VERIFIED" ? "var(--pr-trust-green)" : e.status === "REJECTED" ? "var(--pr-critical-red)" : "var(--pr-warning-amber)",
                  }}
                >
                  {formatStatus(e.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                {["action", "amount", "authority_outcome", "risk_classification"].map((k) => (
                  <div key={k}>
                    <p style={{ color: "var(--pr-text-muted)" }}>{k}</p>
                    <p style={{ color: "var(--pr-text-primary)" }}>{String(e.payload[k] ?? "N/A")}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => verify(e.evidence_id)}
                  className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-all"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-secondary)" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify signature
                </button>
                {verified === true && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--pr-trust-green)" }}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Signature valid
                  </span>
                )}
                {verified === false && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--pr-critical-red)" }}>
                    <ShieldX className="w-3.5 h-3.5" /> Tampered or corrupted
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
