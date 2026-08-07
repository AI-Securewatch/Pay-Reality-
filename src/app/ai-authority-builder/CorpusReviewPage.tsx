import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { aiAuthorityBuilderApi } from "./api";
import { aiPolicyBuilderApi } from "../ai-policy-builder/api";
import type { Candidate } from "../ai-policy-builder/types";
import { CandidateCard } from "../ai-policy-builder/components/CandidateCard";
import { ConfidenceBadge } from "../ai-policy-builder/components/ConfidenceBadge";
import { AiComingSoonBanner } from "../components/AiComingSoonBanner";
import { HelpIcon } from "../help/HelpIcon";
import { NextStepGuidance } from "../help/NextStepGuidance";
import { useAuth } from "../auth/AuthContext";
import { agentsApi } from "../agents/api";
import { describeApiError } from "../live/format";
import { ResolvePrincipalDialog } from "./components/ResolvePrincipalDialog";
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
  border: "1px solid var(--pr-overlay-05)",
  borderRadius: 12,
  marginBottom: 16,
  overflow: "hidden",
};

const rowStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderTop: "1px solid var(--pr-overlay-05)",
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
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div style={sectionStyle}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between"
        style={{ padding: "16px 20px", textAlign: "left" }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--pr-text-primary)" }}>
          {title} ({count})
        </span>
        <span style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div id={contentId}>
          {count === 0 ? (
            <p style={{ ...rowStyle, color: "var(--pr-text-muted)" }}>{emptyLabel}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

export function AIAuthorityBuilderCorpusReviewPage() {
  const { corpusId } = useParams();
  const { user, hasPermission } = useAuth();
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
  const [aiEnabled, setAiEnabled] = useState(true);

  // Stage I.2/I.3: same permissive-when-no-session pattern ReviewQueuePage
  // already uses (Operator Key bypass stays fully usable) -- only disable
  // once we positively know a signed-in user lacks the permission.
  const lacksReviewPermission = !!user && !hasPermission("authority.review");

  // AuthorityPrincipal only carries resolved_principal_id (a bare FK), not
  // the resolved Principal's own name -- resolved separately here via the
  // same real Principal list AgentDirectoryPage.tsx already fetches, so
  // "Resolved -> {name}" is correct for principals resolved in an earlier
  // session too, not just ones resolved through this page just now.
  const [resolvedPrincipalNameById, setResolvedPrincipalNameById] = useState<Record<string, string>>({});
  const [resolvingDiscovery, setResolvingDiscovery] = useState<Principal | null>(null);
  const [relationshipBusyId, setRelationshipBusyId] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  useEffect(() => {
    aiAuthorityBuilderApi.getStatus().then((s) => setAiEnabled(s.ai_enabled));
  }, []);

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
    agentsApi.listPrincipals().then((list) => {
      setResolvedPrincipalNameById(Object.fromEntries(list.map((p) => [p.id, p.name])));
    });
  }

  useEffect(loadAll, [corpusId]);

  function refreshRelationships() {
    if (!corpusId) return;
    aiAuthorityBuilderApi.getRelationships(corpusId).then(setRelationships);
  }

  async function handleResolveRelationship(relationshipId: string) {
    setRelationshipError(null);
    setRelationshipBusyId(relationshipId);
    try {
      await aiAuthorityBuilderApi.resolveRelationship(relationshipId);
      refreshRelationships();
    } catch (e) {
      setRelationshipError(describeApiError(e, "Resolve relationship"));
    } finally {
      setRelationshipBusyId(null);
    }
  }

  async function handleActivateRelationship(relationshipId: string) {
    setRelationshipError(null);
    setRelationshipBusyId(relationshipId);
    try {
      await aiAuthorityBuilderApi.activateRelationship(relationshipId);
      refreshRelationships();
    } catch (e) {
      setRelationshipError(describeApiError(e, "Activate relationship"));
    } finally {
      setRelationshipBusyId(null);
    }
  }

  async function submitAnswer(questionId: string) {
    const answer = answerDrafts[questionId];
    if (!answer?.trim()) return;
    await aiAuthorityBuilderApi.answerQuestion(questionId, answer);
    aiAuthorityBuilderApi.getQuestions(corpusId!).then(setQuestions);
  }

  // "Reviewed" isn't tracked as its own flag -- it's genuinely true once
  // every clarification question has an answer and there's at least one
  // Rule to actually act on next, not a fabricated completion signal.
  const readyToPublish =
    questions !== null && questions.every((q) => q.answered) && (policies?.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-3xl" style={{ backgroundColor: "var(--pr-bg-primary)", minHeight: "100vh" }}>
      <Link to="/governance/authority-builder" style={{ color: "var(--pr-text-muted)", fontSize: 13 }}>
        &lt; Back to corpora
      </Link>
      <div className="mt-2 mb-1 flex items-center gap-1.5">
        <h1 style={{ color: "var(--pr-text-primary)" }}>{corpus?.name ?? "Authority Graph"}</h1>
        <HelpIcon articleId="authority_graph" />
      </div>
      <p style={{ color: "var(--pr-text-muted)", fontSize: 12, marginBottom: 20 }}>
        Every finding below is a reviewable claim, cited to its source document and location, never
        published automatically. Only Rules can be promoted into Governance; everything else is
        informational discovery about this organisation's authority structure.
      </p>

      {!aiEnabled && <AiComingSoonBanner />}

      {summary && (
        <div
          className="grid grid-cols-4 gap-px mb-6 rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--pr-overlay-05)" }}
        >
          {[
            ["Rules", summary.policy_count],
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

      <Section title="Rules" count={policies?.length ?? 0} emptyLabel="No rules were found in this corpus.">
        <div style={{ padding: 20 }}>
          {policies?.map((c) => (
            <CandidateCard key={c.candidate_id} candidate={c} onChanged={loadAll} />
          ))}
        </div>
      </Section>

      <Section title="Principals" count={principals?.length ?? 0} emptyLabel="No principals were found in this corpus.">
        {principals?.map((p) => (
          <div key={p.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {p.name}{p.role ? `, ${p.role}` : ""}{p.reports_to ? ` (reports to ${p.reports_to})` : ""}
              </span>
              <div className="flex items-center gap-2">
                {p.resolved_principal_id ? (
                  <span style={{ fontSize: 12, color: "var(--pr-trust-green)" }}>
                    Resolved &rarr; {resolvedPrincipalNameById[p.resolved_principal_id] ?? p.resolved_principal_id}
                  </span>
                ) : (
                  <button
                    onClick={() => setResolvingDiscovery(p)}
                    disabled={lacksReviewPermission}
                    title={lacksReviewPermission ? "Requires Reviewer, Governance Administrator, or Organisation Owner" : undefined}
                    className="rounded-lg border"
                    style={{
                      color: lacksReviewPermission ? "var(--pr-text-disabled)" : "var(--pr-authority-blue)",
                      fontSize: 12,
                      padding: "4px 10px",
                      borderColor: lacksReviewPermission ? "var(--pr-overlay-10)" : "var(--pr-authority-blue)",
                      opacity: lacksReviewPermission ? 0.6 : 1,
                    }}
                  >
                    Resolve
                  </button>
                )}
                <ConfidenceBadge confidence={p.confidence} />
              </div>
            </div>
            <Citation excerpt={p.source_excerpt} location={p.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Resources" count={resources?.length ?? 0} emptyLabel="No resources were found in this corpus.">
        {resources?.map((r) => (
          <div key={r.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {r.name}{r.description ? `, ${r.description}` : ""}
              </span>
              <ConfidenceBadge confidence={r.confidence} />
            </div>
            <Citation excerpt={r.source_excerpt} location={r.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Operations" count={operations?.length ?? 0} emptyLabel="No operations were found in this corpus.">
        {operations?.map((o) => (
          <div key={o.id} style={rowStyle}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--pr-text-primary)" }}>
                {o.name}{o.description ? `, ${o.description}` : ""}
              </span>
              <ConfidenceBadge confidence={o.confidence} />
            </div>
            <Citation excerpt={o.source_excerpt} location={o.source_location} />
          </div>
        ))}
      </Section>

      <Section title="Relationships" count={relationships?.length ?? 0} emptyLabel="No delegation, escalation, or inheritance links were found in this corpus.">
        {relationshipError && (
          <p role="alert" style={{ ...rowStyle, color: "var(--pr-critical-red)" }}>{relationshipError}</p>
        )}
        {relationships?.map((r) => {
          const bothResolved = !!r.from_principal_id && !!r.to_principal_id;
          const busy = relationshipBusyId === r.id;
          return (
            <div key={r.id} style={rowStyle}>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--pr-text-primary)" }}>
                  <span style={{ textTransform: "uppercase", fontSize: 11, color: "var(--pr-authority-blue)", marginRight: 8 }}>
                    {r.kind}
                  </span>
                  {r.from_principal} &rarr; {r.to_principal}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 99,
                      color: r.status === "active" ? "var(--pr-trust-green)" : "var(--pr-warning-amber)",
                      backgroundColor: r.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                    }}
                  >
                    {r.status === "active" ? "Active" : "Proposed"}
                  </span>
                  {r.status !== "active" && !bothResolved && (
                    <button
                      onClick={() => handleResolveRelationship(r.id)}
                      disabled={lacksReviewPermission || busy}
                      title={lacksReviewPermission ? "Requires Reviewer, Governance Administrator, or Organisation Owner" : undefined}
                      className="rounded-lg border"
                      style={{
                        color: lacksReviewPermission ? "var(--pr-text-disabled)" : "var(--pr-authority-blue)",
                        fontSize: 12,
                        padding: "4px 10px",
                        borderColor: lacksReviewPermission ? "var(--pr-overlay-10)" : "var(--pr-authority-blue)",
                        opacity: lacksReviewPermission || busy ? 0.6 : 1,
                      }}
                    >
                      {busy ? "Resolving..." : "Resolve"}
                    </button>
                  )}
                  {r.status !== "active" && bothResolved && (
                    <button
                      onClick={() => handleActivateRelationship(r.id)}
                      disabled={lacksReviewPermission || busy}
                      title={lacksReviewPermission ? "Requires Reviewer, Governance Administrator, or Organisation Owner" : undefined}
                      className="rounded-lg border"
                      style={{
                        color: lacksReviewPermission ? "var(--pr-text-disabled)" : "var(--pr-trust-green)",
                        fontSize: 12,
                        padding: "4px 10px",
                        borderColor: lacksReviewPermission ? "var(--pr-overlay-10)" : "rgba(34,197,94,0.3)",
                        opacity: lacksReviewPermission || busy ? 0.6 : 1,
                      }}
                    >
                      {busy ? "Activating..." : "Activate"}
                    </button>
                  )}
                  <ConfidenceBadge confidence={r.confidence} />
                </div>
              </div>
              {r.description && <p style={{ fontSize: 13, color: "var(--pr-text-secondary)", marginTop: 4 }}>{r.description}</p>}
              <Citation excerpt={r.source_excerpt} location={r.source_location} />
            </div>
          );
        })}
      </Section>

      <Section title="Conflicts" count={conflicts?.length ?? 0} emptyLabel="No contradictory or duplicate authority was found in this corpus.">
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

      <Section title="Gaps" count={gaps?.length ?? 0} emptyLabel="No missing information was found in this corpus.">
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

      <Section title="Questions" count={questions?.length ?? 0} emptyLabel="No clarification questions were raised for this corpus.">
        {questions?.map((q) => (
          <div key={q.id} style={rowStyle}>
            <p style={{ color: "var(--pr-text-primary)" }}>{q.question}</p>
            {q.context && <p style={{ fontSize: 12, color: "var(--pr-text-muted)", marginTop: 2 }}>{q.context}</p>}
            {q.answered ? (
              <p style={{ fontSize: 13, color: "var(--pr-trust-green)", marginTop: 6 }}>Answered: {q.answer}</p>
            ) : (
              <div className="flex gap-2 mt-2">
                <input
                  aria-label={`Answer: ${q.question}`}
                  placeholder="Answer this question"
                  value={answerDrafts[q.id] ?? ""}
                  onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  style={{
                    backgroundColor: "var(--pr-bg-hover)",
                    border: "1px solid var(--pr-overlay-10)",
                    color: "var(--pr-text-primary)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 13,
                    flex: 1,
                  }}
                />
                <button
                  onClick={() => submitAnswer(q.id)}
                  style={{ color: "var(--pr-authority-blue)", fontSize: 13, padding: "6px 10px" }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>

      {readyToPublish && (
        <NextStepGuidance
          message="This corpus is fully reviewed. Promote a Rule from above, then publish it so it starts governing real agent actions."
          actionLabel="Publish Runtime Policies"
          actionPath="/governance"
        />
      )}

      {resolvingDiscovery && (
        <ResolvePrincipalDialog
          authorityPrincipalId={resolvingDiscovery.id}
          discoveryName={resolvingDiscovery.name}
          discoveryRole={resolvingDiscovery.role}
          onResolved={loadAll}
          onClose={() => setResolvingDiscovery(null)}
        />
      )}
    </div>
  );
}
