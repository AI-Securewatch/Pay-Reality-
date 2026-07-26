import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { aiPolicyBuilderApi } from "./api";
import type { Candidate } from "./types";
import { CandidateCard } from "./components/CandidateCard";

export function AIPolicyBuilderReviewPage() {
  const { uploadId } = useParams();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  function load() {
    aiPolicyBuilderApi.listCandidatesForUpload(uploadId!).then(setCandidates);
  }

  useEffect(load, [uploadId]);

  return (
    <div className="p-8 max-w-3xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to="/policy-studio/upload" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back to uploads
      </Link>
      <h1 className="mt-2 mb-6" style={{ color: "var(--pr-text-primary)" }}>
        Candidate Runtime Policies ({candidates?.length ?? 0})
      </h1>

      {candidates?.length === 0 && (
        <p style={{ color: "var(--pr-text-disabled)" }}>
          No candidates were extracted from this document. This can be a valid outcome (a scanned,
          non-text PDF, or a document with nothing matching a known action).
        </p>
      )}

      {candidates?.map((c) => (
        <CandidateCard key={c.candidate_id} candidate={c} onChanged={load} />
      ))}
    </div>
  );
}
