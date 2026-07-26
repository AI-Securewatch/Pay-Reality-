import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import { apiClient } from "../apiClient";
import { describeApiError, formatStatus } from "../format";
import type { LiveAuthority, LiveDocument, LivePolicy } from "../types";

export function LiveDocuments() {
  const [documents, setDocuments] = useState<LiveDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [authorities, setAuthorities] = useState<LiveAuthority[]>([]);
  const [policies, setPolicies] = useState<LivePolicy[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { limit_amount?: string; currency?: string }>>({});
  const [reviewerName, setReviewerName] = useState("");

  const refreshPolicies = () => apiClient.get<LivePolicy[]>("/v1/policies").then(setPolicies);

  const refreshAuthorities = (documentId: string) =>
    apiClient
      .get<LiveAuthority[]>(`/v1/policies/authorities?document_id=${documentId}`)
      .then(setAuthorities);

  useEffect(() => {
    refreshPolicies();
    apiClient.get<LiveDocument[]>("/v1/policies/documents").then((docs) => {
      setDocuments(docs);
      if (docs.length > 0) setSelectedDocId(docs[0].document_id);
    });
  }, []);

  useEffect(() => {
    if (selectedDocId) refreshAuthorities(selectedDocId);
  }, [selectedDocId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const doc = await apiClient.post<LiveDocument>("/v1/policies/documents", form);
      setDocuments((prev) => [doc, ...prev]);
      setSelectedDocId(doc.document_id);
      setMessage(
        doc.status === "extracted"
          ? "Document uploaded and extracted. Review the candidate authority below."
          : `Document uploaded but extraction did not complete (status: ${doc.status}).`
      );
    } catch (e) {
      setMessage(describeApiError(e, "Upload"));
    } finally {
      setUploading(false);
    }
  };

  const approve = async (authorityId: string) => {
    const edit = edits[authorityId];
    const body: Record<string, unknown> = {
      status: "approved",
      reviewer_id: reviewerName.trim() || "unspecified reviewer",
    };
    if (edit?.limit_amount || edit?.currency) {
      body.edits = {
        ...(edit.limit_amount ? { limit_amount: Number(edit.limit_amount) } : {}),
        ...(edit.currency ? { currency: edit.currency } : {}),
      };
    }
    await apiClient.patch(`/v1/policies/authorities/${authorityId}`, body);
    if (selectedDocId) refreshAuthorities(selectedDocId);
  };

  const reject = async (authorityId: string) => {
    const reason = window.prompt("Rejection reason (required):");
    if (!reason) return;
    await apiClient.patch(`/v1/policies/authorities/${authorityId}`, {
      status: "rejected",
      reviewer_id: reviewerName.trim() || "unspecified reviewer",
      rejection_reason: reason,
    });
    if (selectedDocId) refreshAuthorities(selectedDocId);
  };

  const compileAndActivate = async () => {
    if (!selectedDocId) return;
    setMessage(null);
    try {
      const compiled = await apiClient.post<{ policy_id: string; version: number; mandate_count: number }>(
        `/v1/policies/${selectedDocId}/compile`
      );
      await apiClient.post(`/v1/policies/${compiled.policy_id}/activate`);
      setMessage(`Policy v${compiled.version} compiled (${compiled.mandate_count} mandate(s)) and activated.`);
      refreshPolicies();
    } catch (e) {
      setMessage(describeApiError(e, "Compile and activate"));
    }
  };

  const activePolicy = policies.find((p) => p.status === "active");
  const pendingCount = authorities.filter((a) => a.status === "pending_review").length;
  const hasApproved = authorities.some((a) => a.status === "approved");

  return (
    <div className="p-8" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: "var(--pr-text-primary)" }}>Documents & Review</h1>
        <p style={{ color: "var(--pr-text-muted)" }}>
          Upload a delegation-of-authority document, review what was extracted, then compile and
          activate the resulting policy.
        </p>
      </div>

      <div
        className="p-6 rounded-xl border mb-6"
        style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        <label
          className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all"
          style={{ borderColor: "rgba(77,124,254,0.25)" }}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--pr-authority-blue)" }} />
          ) : (
            <Upload className="w-6 h-6" style={{ color: "var(--pr-authority-blue)" }} />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
            {uploading ? "Uploading and extracting..." : "Upload a delegation-of-authority PDF"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>

        <div className="mt-4">
          <label htmlFor="reviewer-name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
            Your name (recorded as the reviewer for any approval or rejection below)
          </label>
          <input
            id="reviewer-name"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full max-w-xs px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
          />
        </div>

        {message && (
          <p role="alert" className="text-sm mt-4" style={{ color: "var(--pr-text-secondary)" }}>{message}</p>
        )}
      </div>

      {documents.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {documents.map((d) => (
            <button
              key={d.document_id}
              onClick={() => setSelectedDocId(d.document_id)}
              className="px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-all"
              style={{
                backgroundColor: selectedDocId === d.document_id ? "rgba(77,124,254,0.12)" : "transparent",
                borderColor: selectedDocId === d.document_id ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.08)",
                color: selectedDocId === d.document_id ? "var(--pr-text-primary)" : "var(--pr-text-muted)",
              }}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              {d.name}
            </button>
          ))}
        </div>
      )}

      {selectedDocId && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg" style={{ color: "var(--pr-text-primary)" }}>
              Candidate Authority ({authorities.length})
            </h2>
            <button
              onClick={compileAndActivate}
              disabled={!hasApproved}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-40"
              style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
            >
              <Zap className="w-4 h-4" />
              Compile & Activate
            </button>
          </div>

          {activePolicy && (
            <p className="text-xs mb-4" style={{ color: "var(--pr-text-muted)" }}>
              Currently active: Policy v{activePolicy.version} ({activePolicy.bundle_hash.slice(0, 20)}...)
            </p>
          )}

          <div className="space-y-3">
            {authorities.map((a) => (
              <div
                key={a.authority_id}
                className="p-5 rounded-xl border"
                style={{ backgroundColor: "var(--pr-bg-card)", borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--pr-text-primary)" }}>
                      {a.scope}
                    </p>
                    <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                      Page {a.source_page}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                    style={{
                      backgroundColor:
                        a.status === "approved" ? "rgba(34,197,94,0.1)" : a.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      color:
                        a.status === "approved" ? "var(--pr-trust-green)" : a.status === "rejected" ? "var(--pr-critical-red)" : "var(--pr-warning-amber)",
                    }}
                  >
                    {formatStatus(a.status)}
                  </span>
                </div>

                <p
                  className="text-xs font-mono p-2 rounded mb-3"
                  style={{ backgroundColor: "rgba(0,212,255,0.06)", color: "var(--pr-evidence-cyan)" }}
                >
                  "{a.source_excerpt}"
                </p>

                {a.validation_flags.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {a.validation_flags.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--pr-warning-amber)" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {a.status === "pending_review" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`limit-${a.authority_id}`} className="block text-xs font-medium mb-1.5" style={{ color: "var(--pr-text-muted)" }}>
                        Limit amount (extracted: {a.limit_amount ?? "N/A"})
                      </label>
                      <input
                        id={`limit-${a.authority_id}`}
                        type="number"
                        placeholder={String(a.limit_amount ?? "")}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ backgroundColor: "var(--pr-bg-hover)", borderColor: "rgba(255,255,255,0.1)", color: "var(--pr-text-primary)" }}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [a.authority_id]: { ...prev[a.authority_id], limit_amount: e.target.value } }))
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => approve(a.authority_id)}
                        className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
                        style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "var(--pr-trust-green)" }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => reject(a.authority_id)}
                        className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
                        style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--pr-critical-red)" }}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ) : a.status === "rejected" ? (
                  <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                    Rejected: {a.rejection_reason}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--pr-text-primary)" }}>
                    Approved limit: {a.limit_amount} {a.currency}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
