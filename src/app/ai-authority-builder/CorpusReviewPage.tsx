import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { aiAuthorityBuilderApi } from "./api";
import { aiPolicyBuilderApi } from "../ai-policy-builder/api";
import type { Candidate } from "../ai-policy-builder/types";
import { CandidateCard } from "../ai-policy-builder/components/CandidateCard";
import { ConfidenceBadge } from "../ai-policy-builder/components/ConfidenceBadge";
import type {
  Conflict,
  Corpus,
  Gap,
  GraphSummary,
  Operation,
  Principal,
  Question,
  Relationship,
  Resource,
} from "./types";

const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--pr-bg-card)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 12,
  marginBottom: 16,
  overflow: "hidden",
};

const rowStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderTop: "1px solid rgba(255,255,255,0.05)",
  fontSize: 13,
};

function Citation({ excerpt, location }: { excerpt: string | null; location: string | null }) {
  if (!excerpt) return null;
  return (
    <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--pr-text-muted)", marginTop: 4 }}>
      "{excerpt}"{location ? ` (${location})` : ""}
    </p>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={sectionStyle}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
        style={{ padding: "16px 20px", textAlign: "left" }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--pr-text-primary)" }}>
          {title} ({count})
        </span>
        <span style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (count === 0 ? (
        <p style={{ ...rowStyle, color: "var(--pr-text-disabled)" }}>None found.</p>
      ) : (
        children
      ))}
    </div>
  );
}

export function AIAuthorityBuilderCorpusReviewPage() {
  const { corpusId } = useParams();
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [policies, setPolicies] = useState<Candidate[] | null>(null);
  const [principals, setPrincipals] = useState<Principal[] | null>(null);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [operations, setOperations] = useState<Operation[] | null>(null);
  const [relationships, setRelationships] = useState<Relationship[] | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  function loadAll() {
    if (!corpusId) return;
    aiAuthorityBuilderApi.getCorpus(corpusId).then(setCorpus);
    aiAuthorityBuilderApi.getSummary(corpusId).then(setSummary);
    aiPolicyBuilderApi.listCandidatesForCorpus(corpusId).then(setPolicies);
    aiAuthorityBuilderApi.getPrincipals(corpusId).then(setPrincipals);
    aiAuthorityBuilderApi.getResources(corpusId).then(setResources);
    aiAuthorityBuilderApi.getOperations(corpusId).then(setOperations);
    aiAuthorityBuilderApi.getRelationships(corpusId).then(setRelationships);
    aiAuthorityBuilderApi.getConflicts(corpusId).then(setConflicts);
    aiAuthorityBuilderApi.getGaps(corpusId).then(setGaps);
    aiAuthorityBuilderApi.getQuestions(corpusId).then(setQuestions);
  }

  useEffect(loadAll, [corpusId]);

  async function submitAnswer(questionId: string) {
    const answer = answerDrafts[questionId];
    if (!answer?.trim()) return;
    await aiAuthorityBuilderApi.answerQuestion(questionId, answer);
    aiAuthorityBuilderApi.getQuestions(corpusId!).then(setQuestions);
  }

  return (
    <div className="p-8 max-w-3xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to="/policy-studio/authority-builder" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back to corpora
      </Link>
      <h1 className="mt-2 mb-1" style={{ color: "var(--pr-text-primary)" }}>{corpus?.name ?? "Authority Graph"}</h1>
      <p style={{ color: "var(--pr-text-disabled)", fontSize: 12, marginBottom: 20 }}>
        Every finding below is a reviewable claim, cited to its source document and location, never
        auto-deployed. Only Runtime Policies can be promoted into Policy Studio; everything else is
        informational discovery about this organisation's authority structure.
      </p>

      {summary && (
        <div
          className="grid grid-cols-4 gap-px mb-6 rounded-xl overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {[
            ["Runtime Policies", summary.policy_count],
            ["Principals", summary.principal_count],
            ["Resources", summary.resource_count],
            ["Operations", summary.operation_count],
            ["Relationships", summary.relationship_count],
            ["Conflicts", summary.conflict_count],
            ["Gaps", summary.gap_count],
            ["Questions", summary.question_count],
          ].map(([label, value]) => (
            <div key={label as string} className="p-4 text-center" style={{ backgroundColor: "var(--pr-bg-card)" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--pr-text-primary)" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--pr-text-muted)" }}>{label as string}</div>
            </div>
          ))}
        </div>
      )}

      <Section title="Runtime Policies" count={policies?.length ?? 0}>
        <div style={{ padding: 20 }}>
          {policies?.map((c) => (
            <CandidateCard key={c.candidate_id} candidate={c} onChanged={loadAll} />
          ))}
        </div>
      </Section>

      <Section title="Principals" count={principals?.length ?? 0}>
        {principals?.map((p) => (
          <div key={p.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {p.name}{p.role ? ` — ${p.role}` : ""}{p.reports_to ? ` (reports to ${p.reports_to})` : ""}
              </span>
              <ConfidenceBadge confidence={p.confidence} />
            </div>
            <Citation excerpt={p.source_excerpt} location={p.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Resources" count={resources?.length ?? 0}>
        {resources?.map((r) => (
          <div key={r.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {r.name}{r.description ? ` — ${r.description}` : ""}
              </span>
              <ConfidenceBadge confidence={r.confidence} />
            </div>
            <Citation excerpt={r.source_excerpt} location={r.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Operations" count={operations?.length ?? 0}>
        {operations?.map((o) => (
          <div key={o.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {o.name}{o.description ? ` — ${o.description}` : ""}
              </span>
              <ConfidenceBadge confidence={o.confidence} />
            </div>
            <Citation excerpt={o.source_excerpt} location={o.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Relationships" count={relationships?.length ?? 0}>
        {relationships?.map((r) => (
          <div key={r.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                <span style={{ textTransform: "uppercase", fontSize: 11, color: "var(--pr-authority-blue)", marginRight: 8 }}>
                  {r.kind}
                </span>
                {r.from_principal} &rarr; {r.to_principal}
              </span>
              <ConfidenceBadge confidence={r.confidence} />
            </div>
            {r.description && <p style={{ fontSize: 13, color: "var(--pr-text-secondary)", marginTop: 4 }}>{r.description}</p>}
            <Citation excerpt={r.source_excerpt} location={r.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Conflicts" count={conflicts?.length ?? 0}>
        {conflicts?.map((c) => (
          <div key={c.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-critical-red)" }}>{c.description}</span>
              <ConfidenceBadge confidence={c.confidence} />
            </div>
            {c.reasoning && <p style={{ fontSize: 12, color: "var(--pr-text-muted)", marginTop: 4 }}>{c.reasoning}</p>}
          </div>
        ))}
      </Section>

      <Section title="Gaps" count={gaps?.length ?? 0}>
        {gaps?.map((g) => (
          <div key={g.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-warning-amber)" }}>{g.description}</span>
              <ConfidenceBadge confidence={g.confidence} />
            </div>
            <Citation excerpt={g.source_excerpt} location={g.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Questions" count={questions?.length ?? 0}>
        {questions?.map((q) => (
          <div key={q.id} style={rowStyle}>
            <p style={{ color: "var(--pr-text-primary)" }}>{q.question}</p>
            {q.context && <p style={{ fontSize: 12, color: "var(--pr-text-muted)", marginTop: 2 }}>{q.context}</p>}
            {q.answered ? (
              <p style={{ fontSize: 13, color: "var(--pr-trust-green)", marginTop: 6 }}>Answered: {q.answer}</p>
            ) : (
              <div className="flex gap-2 mt-2">
                <input
                  placeholder="Answer this question"
                  value={answerDrafts[q.id] ?? ""}
                  onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  style={{
                    backgroundColor: "var(--pr-bg-hover)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--pr-text-primary)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 13,
                    flex: 1,
                  }}
                />
                <button onClick={() => submitAnswer(q.id)} style={{ color: "var(--pr-authority-blue)", fontSize: 13 }}>
                  Save
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}
