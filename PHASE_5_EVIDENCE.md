# Phase 5: The Evidence Engine, Extended

Status: proposed. No dependency on Phases 1–4 — this can proceed independently, any time, though the lineage fields (below) become more valuable once Phase 1/4's provenance data exists to link to.

## What already exists, unchanged

Today's Evidence is genuinely solid, and nothing here replaces it: SHA-256 of canonical (sorted-key, whitespace-free) JSON, Ed25519-signed, with historical-key-safe verification (a record signed before a key rotation still verifies against the key that actually signed it, resolved via the `signing_keys` registry by the `key_id` stored on the record itself). Confirmed immutable — append-only, never mutated; resolving a `HUMAN_REVIEW` decision creates a second Evidence row rather than editing the first. This phase extends that foundation; it does not touch how an individual record is signed or verified.

## Evidence Chaining

**The gap today**: each Evidence record is independently verifiable, but the *sequence* of records isn't. Deleting a record, or reordering the history, isn't detectable from the records that remain — verification proves "this record wasn't altered," not "nothing was removed and nothing else happened in between."

**The fix**: each new Evidence record's payload includes `previous_hash` — the SHA-256 hash of the immediately preceding Evidence record's canonical payload, within a defined chaining scope (see below). This is computed and stored the same way every other Evidence field is today: as part of the payload dict, canonicalized and signed along with everything else, so `previous_hash` is itself cryptographically covered by the record's own signature.

**Chaining scope**: chain per-Organisation, not globally and not per-Principal. Globally would make chain verification a single, ever-growing bottleneck with no natural partition; per-Principal would fragment the chain below the level most audiences (an auditor, an insurer) actually care about, which is "this organisation's complete decision history." Per-Organisation is also the natural unit given Phase 1's schema — every Principal already resolves to exactly one Organisation.

**Tamper detection**: verifying the chain means, for a given range, confirming (a) every record's own signature is valid (unchanged, today's mechanism) and (b) every record's stored `previous_hash` matches the actual computed hash of the record immediately before it in sequence. A deleted record breaks (b) at the gap it left, even though every remaining record's own signature still checks out — this is precisely the failure mode signature-only verification cannot catch today.

## Timeline Reconstruction

A direct consequence of chaining, not a separate mechanism: given any two Evidence records in the same Organisation's chain, walking `previous_hash` backward from the later one reconstructs the complete, gap-checked sequence between them. This is the concrete capability "prove nothing happened, and nothing was removed, between these two points in time" — the property regulators, insurers, and auditors actually ask for, stated precisely rather than asserted.

## Decision Lineage, Policy Lineage, Agent Lineage, Authority Lineage

All four are **the same underlying capability — following existing and Phase-1/4-added foreign keys — presented as different entry points into one trace**, not four separate mechanisms:

```
Evidence  →  Decision (existing decision_id FK)
          →  RuntimePolicy version that produced it (existing policy_id FK on Decision)
          →  source_authority_relationship_id (Phase 4's promotion provenance, if the
             policy was generated rather than hand-authored)
          →  source Authority Model fact (the AuthorityRelationship row, Phase 1)
          →  source_excerpt / source_location (existing AI Authority Builder citation fields)
          →  the original governance document (existing AuthorityCorpusDocument)
```

- **Decision lineage**: start from an Evidence record, walk to its Decision — already possible today via the existing `decision_id` FK; this phase adds nothing new here beyond exposing it as a named capability.
- **Policy lineage**: extend one hop further, to every version of the `RuntimePolicyRecord` the Decision matched against, via `RuntimePolicyRecord`'s existing append-only version history.
- **Agent lineage**: from the Decision's Intent, to `Agent`, to every prior lifecycle event for that agent (`AgentAuditEvent` — already a complete, signed audit trail today).
- **Authority lineage**: the new hop this phase adds real value to — from the `RuntimePolicy` to `source_authority_relationship_id` (Phase 4) to the original source document, closing the loop from "a decision was made" all the way back to "here is the sentence in the uploaded governance document that authorized this."

No new table is required for this — it's a defined *query*, joining existing and Phase-1/4-added foreign keys, documented as a first-class capability (and surfaced as a UI feature in Phase 6's "Decision Replay"/"Historical Reconstruction") rather than left as something only reconstructable by an engineer with direct database access.

## Independent Verification

Unchanged mechanism, extended scope: today's `POST /v1/evidence/{id}/verify` checks one record's signature. This phase adds an equivalent chain-verification endpoint/tool that checks a range (or an entire Organisation's history) for both individual-signature validity and `previous_hash` continuity — usable by a third party (an auditor, a regulator, an insurer) with only the platform's published verification key, no special access to the platform itself, exactly matching today's existing "independently verifiable" claim, now extended to sequences rather than only single records.

## Long-Term Archival

Evidence is already append-only and already never deleted. What's missing for genuine long-term archival is an explicit, periodic export of a signed, chained range into a durable, write-once-read-many (WORM) store external to the platform's own operational database — not because the database itself is untrustworthy, but because "independently verifiable" is a stronger claim when the verification copy doesn't depend on the platform's own continued operation or goodwill. This is an operational/infrastructure capability (a scheduled export job, a retention policy, a choice of WORM storage provider), not a schema change — it consumes the chain this phase already defines.

## Regulatory Evidence, Insurance Evidence, Board Reporting

All three are **presentation layers over the same chained, lineage-complete Evidence data** — not three separate evidence types requiring three separate data models:

- **Regulatory evidence**: a report generator producing exactly the "decision → policy → authority → source document" lineage trace above, for a defined time range and scope, in whatever format a given regulator's submission process requires. The underlying data doesn't change per regulator; only the formatting/filtering does.
- **Insurance evidence**: the same lineage trace, typically summarized (e.g. "every high-risk decision in this period, with full provenance") rather than exhaustive — a filtered view, not a different data model.
- **Board reporting**: a further-summarized rollup (counts, trends, exceptions) over the same underlying chain — this is the least novel of the three, closest to what `LiveAssurance.tsx`'s existing rollup already does today, extended to pull from the richer lineage data this phase adds.

None of these three require new Evidence fields beyond what Chaining and Lineage already add — they're reporting/export tooling (a Phase 6 platform capability, sequenced there deliberately, since "generate a report" is product surface, while "the data the report is built from is real and chained" is this phase's actual contribution).

## Migration Notes

- `previous_hash` is a new, additive field in the Evidence payload — add a `payload_version` field alongside it (recommended by `DOMAIN_REFACTOR_PLAN.md` item 8 for an unrelated Evidence change, and equally applicable here) so tooling can distinguish chained (v2+) records from pre-chaining (v1) records unambiguously. Historical records are never retroactively chained — the chain starts from whenever this phase ships, and that boundary is explicit, not papered over.
- `source_authority_relationship_id` (Phase 4) is required for Authority Lineage to resolve past the Policy level for a given record — records for hand-authored policies with no Authority Model provenance simply stop their lineage trace at the Policy level, which is exactly as informative as today's status quo, never a regression.
