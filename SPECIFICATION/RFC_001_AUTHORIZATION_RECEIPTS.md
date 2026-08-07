# RFC-001: Authorization Receipts as the Primary Output of Runtime Authority

**Status:** Draft — for discussion
**Component:** Runtime Authority / Evidence Engine
**Supersedes:** None. Extends `13_EVIDENCE_ENGINE.md`.
**Author:** Systems Architecture

---

## 1. Background

Runtime Authority evaluates whether an autonomous agent is permitted to take a real-world action, given an organization's Authority Graph (who may delegate what, to whom, under which constraints) and its Runtime Policies (the operationalized version of Delegation of Authority, approval limits, separation of duties, and role hierarchies). Every evaluation terminates in one of three outcomes — `ALLOW`, `DENY`, `HUMAN_REVIEW` — and today that outcome is recorded as a signed record inside the Evidence Vault: a database-backed store, presented through the Evidence Portal, verifiable by re-checking a signature against records the platform itself continues to hold and serve.

That design has served its purpose: it makes decisions non-repudiable *while PayReality is running and the customer trusts PayReality's infrastructure to keep serving correct historical data.* The architectural question this RFC addresses is what happens when either of those conditions fails to hold — when a regulator wants to check a decision five years after the fact, when an insurer wants to underwrite risk without operational access to PayReality's database, when an enterprise customer wants to prove compliance to a third party without routing that third party through PayReality's own API, or when PayReality itself is no longer the entity a verifier is willing to trust unconditionally.

The evolution proposed here is narrow but consequential: **the unit of trust changes from a database row to a self-contained, independently verifiable artifact.** We call that artifact the Authorization Receipt. Runtime Authority does not change what it decides. It changes what it hands back as proof that it decided.

## 2. Problem Statement

A database record, however well-signed, has a structural limitation: verifying it requires querying the system that produced it, or a copy of that system's data that the verifier trusts to be complete and unaltered. This is true even if individual rows carry a signature, because the *set* of rows a verifier is shown is itself controlled by the platform. Nothing prevents (or, more precisely, nothing lets a third party detect) a record being quietly omitted, backdated, or never having existed in the first place. Signing a row proves the row wasn't tampered with *after being shown to you*. It does not prove the row is the complete and honest history.

This matters specifically because of who is meant to rely on these records and when:

- **Auditors and regulators** operate on timelines of years, often examining decisions made by teams, policies, and sometimes companies that no longer exist in their original form. A verification process that depends on PayReality's live systems being available, unchanged, and cooperative is a single point of failure for compliance itself.
- **Insurers** underwriting AI-operational risk need to assess a customer's authorization history without being granted operational access to that customer's PayReality tenant — a portable artifact they can independently validate is fundamentally different from a data-sharing agreement.
- **Enterprise customers** increasingly need to prove *to their own auditors, boards, or regulators* that a given AI-initiated action was authorized under their governance — without PayReality being a required intermediary in that conversation every time it happens.
- **Third-party systems** (other platforms, other agents, cross-enterprise workflows) may eventually need to check "was this action authorized" as a machine-to-machine call, which is a fundamentally different consumption pattern than a human opening the Evidence Portal.

Platform-bound evidence — evidence whose trustworthiness depends on continued access to the platform — cannot serve any of these cases without asking the verifier to trust PayReality unconditionally, indefinitely, and operationally. That is a weaker trust model than the thing being verified (an organization's own governance) usually requires. Portable authorization artifacts — objects that are self-describing, cryptographically self-verifying, and meaningful outside PayReality's infrastructure — close that gap.

## 3. Design Goals

1. **Independent verification.** A receipt must be checkable using only the receipt itself, a public key (or a small, independently-obtainable trust root), and open verification logic — not a live API call to PayReality.
2. **Immutability.** Once issued, a receipt's content never changes. Corrections are additive (new, linked receipts), never edits.
3. **Cryptographic integrity.** Tampering with any field must be detectable. This RFC treats signature verification as necessary but not sufficient — see §8 on why signing alone is an incomplete trust model.
4. **Long-term auditability.** A receipt issued today must remain verifiable in a decade, across key rotations and (eventually) cryptographic algorithm migrations.
5. **Enterprise interoperability.** Receipts should be consumable by systems PayReality does not control — GRC platforms, insurer risk systems, regulator submission portals — which argues for a documented, versioned, boring format over a clever proprietary one.
6. **Minimal disclosure.** A receipt should prove that a decision was made correctly without necessarily exposing the sensitive content of the decision (counterparties, amounts, contract terms) to every party who might ever need to check that the decision happened.
7. **Privacy preservation.** Minimal disclosure by default; full disclosure available on demand, to a specific verifier, under the customer's control — not PayReality's.
8. **Backwards compatibility.** Every Evidence record produced before this system exists must remain valid evidence. This is not a data migration project.
9. **Evidence portability.** A customer, auditor, or insurer should be able to *export* their receipts and lose nothing verifiable in the process.

## 4. Non-Goals

This RFC explicitly does **not** propose to:

- **Replace Runtime Authority.** The decision engine, Authority Graph, and Runtime Policy evaluation are unchanged. This is a change to what happens *after* a decision is made, not how it's made.
- **Replace the Evidence Portal.** The portal remains the primary human interface. It changes what it's a window *into* (§9).
- **Replace governance documents.** A receipt attests that a policy was correctly applied; it does not, and should not, become the authoritative copy of the organization's Delegation of Authority or approval matrix. The organization's own governance documents remain the root of authority. PayReality operationalizes them; it does not own them.
- **Replace execution systems.** This is the most important non-goal to state precisely, because it is the easiest one to get wrong by omission: **an Authorization Receipt proves that an action was authorized. It does not, and cannot, prove that the action was subsequently executed, executed correctly, or executed at all.** Conflating "authorized" with "happened" would misrepresent what this system can attest to. Whether a downstream ERP, payment rail, or infrastructure API actually carried out an allowed action is a separate problem — execution attestation — and is out of scope here (see §12).

## 5. Architecture

### 5.1 Lifecycle

```
Agent (signed Intent)
        │
        ▼
Runtime Authority ── Authority Graph Evaluation ── Runtime Policy Evaluation
        │
        ▼
Authorization Decision (ALLOW / DENY / HUMAN_REVIEW)
        │
        ▼
Authorization Receipt (created, signed)
        │
        ├──► Evidence Portal (human presentation layer)
        │
        └──► Transparency Log (periodic Merkle-root commitment — new; see §8)
                    │
                    ▼
            Independent Verification
        (by anyone, at any future time, without calling PayReality)
```

This matches the lifecycle sketched in the prompt with one structural addition: a **transparency log** sitting between receipt issuance and "independent verification." §8 explains why this addition isn't optional if we actually mean "not requiring PayReality's mutable database to be trusted" — a signed receipt alone doesn't deliver that property; a signed receipt *provably included in a periodically-published, append-only log* does.

### 5.2 Grounding in the current system

Concretely, in terms of components that already exist: an Agent submits a signed Intent (`X-PayReality-Key-Id` / `X-PayReality-Signature`, per the existing agent certificate model) to `/v1/intents`. The Decision Engine evaluates it against the Authority Graph and the compiled Runtime Policy set, producing a `Decision` with an `outcome` of `ALLOW`/`DENY`/`HUMAN_REVIEW`. Today, this produces an `Evidence` record with a `key_id`, a signature, and a verify-in-place UI action. The receipt is the evolution of that Evidence record: same trust-generating event, restructured to be self-contained and exportable rather than a row plus an API endpoint that checks it.

`HUMAN_REVIEW` deserves a specific architectural note. Today, resolution (`approved`/`denied`, `resolved_by`, `reason`) mutates the decision's state. Under the receipt model, **resolution must not mutate the original receipt.** The original `HUMAN_REVIEW` receipt is immutable and correctly describes the state of the world at evaluation time — a human's judgment was required. The resolution is a *second*, separate, linked receipt (a **Resolution Receipt**, referencing the original by hash), issued when the human decides. This preserves immutability without losing the resolution outcome, and it means a receipt chain can show, honestly, that a decision took two steps and who was accountable for the second one.

## 6. Authorization Receipt Specification (v1)

Design principle for this section: every field must earn its place by supporting either verification or minimal-disclosure privacy — not convenience, not analytics, not "might be useful later."

| Field | Purpose |
|---|---|
| `schema_version` | Pins the receipt to a versioned spec so verifiers (including future ones) know how to parse it. Never assume the latest version is the only one in circulation — receipts from `v1` must remain parseable after `v2` ships. |
| `receipt_id` | A time-sortable unique identifier (ULID). Sortability is a verification convenience — it makes ordering-based checks (§8, chain integrity) tractable without a separate index. |
| `receipt_type` | `DECISION` or `RESOLUTION` (§5.2). Distinguishes an original decision from a later human-review outcome, since these have different required fields and different immutability semantics. |
| `issuer` | `{ platform: "payreality", tenant_id }`. Identifies who is asserting this, and for which customer's authority context — necessary because verification of the policy hash (below) is meaningless without knowing whose policy set to check it against. |
| `issued_at` | UTC timestamp of signing. This is a fact about when the receipt was created, not a claim about when the underlying action occurred — those can differ and both matter, so §6 keeps them as separate fields rather than collapsing them. |
| `decision` | `ALLOW` \| `DENY` \| `HUMAN_REVIEW`. The actual outcome. This is the one field every consumer needs and none of them should have to guess at. |
| `agent_id` + `agent_key_thumbprint` | Identifies which agent's signed intent this decision responds to, and which of its keys was current at the time — necessary for later verification that the intent itself was validly signed, without needing the agent's full certificate history retrieved live. |
| `intent_hash` | SHA-256 of the canonicalized intent payload. **Not the payload itself.** This is the load-bearing privacy design choice in this spec: a verifier who is separately given the disclosed intent (by the customer, on demand) can confirm it matches this hash and therefore matches what was actually evaluated — without the hash's mere existence in a receipt disclosing anything about the intent's content to parties who were never meant to see it. |
| `intent_classification` | A small, deliberately coarse, non-sensitive tag — e.g. `{ action_type: "payment", risk_tier: "high" }`. Enough for a human scanning a receipt list to orient themselves without needing to unseal the full intent. This is the one place this spec accepts a small amount of *disclosed* metadata by default, because a completely opaque receipt list is unusable, and this level of disclosure (a category, not a value) is judged low-risk. This judgment should be revisited per-industry — healthcare and payments may reasonably want different defaults here, which argues for this being tenant-configurable rather than fixed.
| `policy_snapshot_hash` | SHA-256 of the exact, effective Runtime Policy set and Authority Graph state that was active at evaluation time. This is what makes a receipt *checkable*, not just *signed* — a verifier who is later given the actual policy bundle (again, by the customer, not by default) can hash it and confirm it's the one that was really in force, then re-derive the same decision themselves. Without this field, "verification" degenerates to "trust the signature," which is a weaker property than this RFC's goals call for. |
| `decision_engine_version` | The exact build identifier of the deterministic evaluation logic. Paired with the policy snapshot and intent, this is what makes **replay** possible — the strongest tier of verification this spec supports (§8). |
| `human_review` (present only when `decision_engine_version` produced `HUMAN_REVIEW`, or on a `RESOLUTION` receipt) | `{ required_reason_code }` on the decision receipt; `{ resolved_by_role, resolution, resolved_at, resolution_reason_hash, prior_receipt_id }` on the resolution receipt. Reviewer identity is a role/pseudonym reference by default, not a name — matching minimal disclosure; the customer's own identity system remains the place where "which specific human" is resolvable, on demand. |
| `prior_receipt_hash` (per-tenant) | Hash of the immediately preceding receipt issued for this tenant. Forms an append-only hash chain. This is the mechanism (not a signature) that makes silent deletion or reordering detectable — breaking the chain is structurally visible even without external help, and becomes *provably* visible once chain checkpoints are externally committed (§8). |
| `merkle_inclusion_proof` | Populated asynchronously, once the receipt has been included in a periodically published Merkle root (§8). Absence of this field on a very recent receipt is expected and not itself suspicious; permanent absence is. |
| `signature` + `signing_key_id` | Signature over the canonical serialization of every field above; `signing_key_id` references a published, append-only key-transparency record (§7.5), not just "trust today's API response about which key is valid." |
| `revocation_pointer` (optional, usually absent) | Not a boolean "is this revoked" — a reference to a *later* receipt that supersedes or corrects this one, if one exists. Facts about what was decided, and when, don't get revoked; a later, linked correction is itself a new receipt (§7.8). |

**Deliberately excluded from v1:** raw intent content, raw policy text, human reviewer's real name/email, agent's full certificate chain, any field whose only purpose is internal cross-referencing convenience (those belong in the Evidence Portal's database, referenced *from* the receipt via a `decision_id`-style pointer if useful, never embedded in the trust-bearing artifact itself). If it doesn't change what a verifier can conclude, it doesn't belong in the receipt.

## 7. Receipt Lifecycle

**Creation.** At the moment the Decision Engine terminates evaluation, before any response is returned to the agent. Creation must be synchronous with the decision itself — a receipt created "later" from logs reopens exactly the trust gap this system exists to close.

**Signing.** Immediately after creation, using the tenant's current signing key. Signing and creation should be treated as a single atomic step in the runtime — no unsigned receipt should ever be persisted or referenced.

**Storage.** Canonical storage is the Evidence Vault, as today — the receipt is a new, more disciplined shape of what's already stored there, not a new datastore.

**Export.** A receipt (or a bundle of them) must be exportable as a self-contained file — the whole point of §3's independent-verification goal is that export shouldn't lose anything a verifier needs. An exported receipt bundle should include the receipt(s), the relevant Merkle inclusion proofs, and enough of the key-transparency record to verify the signature without a live call back to PayReality.

**Verification.** Two tiers, deliberately distinct (see §8 for why one tier is not enough):
- *Shallow*: signature valid, chain-linked correctly, Merkle inclusion confirmed. Fast, requires nothing from the customer.
- *Deep*: the above, plus the customer discloses the actual intent and policy bundle to the verifier, who confirms both hash-match the receipt and that replaying evaluation against them (using the referenced engine version) reproduces the same decision.

**Archival.** Receipts do not get "archived" in the sense of moving somewhere less accessible — their entire value is remaining accessible and verifiable indefinitely. What can reasonably move to colder storage is the *bulk* Evidence Portal presentation data (search indices, UI caches); the receipts and their Merkle proofs should be treated as data with no expiry.

**Retention.** This is a customer/regulatory decision, not a platform one — PayReality should support configurable retention policies per tenant, but the architecture should make the *default* "keep forever," since a missing receipt for a real historical decision is a worse failure mode than storage cost.

**Revocation.** As above (§6): not deletion, not mutation — a new, linked receipt. "Revoking" a receipt because the signing key was later found compromised, for instance, should produce a correction receipt referencing the original, not erase the original. The original still correctly records "this is what the system asserted, signed with this key, at this time" — which remains true and relevant even if the key is later distrusted.

**Key rotation.** Signing keys should rotate on a defined schedule (and immediately on suspected compromise), following a model closer to certificate authorities than to application secrets: a small number of long-lived, well-protected keys, each with a published validity window, tracked in an append-only key-transparency log so that a receipt signed by a since-rotated key remains verifiable by looking up which key was valid *at the time the receipt claims to have been issued* — not which key is valid *now*. This is the mechanism that makes "verified years later" survive routine key hygiene rather than being broken by it.

## 8. Trust Model

**What must be trusted:**
- That PayReality's Decision Engine correctly implements the customer's stated policies at the time of evaluation (this is a claim about software correctness, not about the receipt architecture — receipts don't fix a buggy decision engine, they faithfully record what it decided).
- That the signing key was genuinely controlled by PayReality and not compromised at the moment of signing.
- That the customer's own governance documents (Delegation of Authority, approval matrices) are accurately reflected in the Authority Graph the customer configured — PayReality attests to policy *application*, not to whether the policy itself is a good one.

**What should not require trust — and the honest gap in a signature-only design:**
A signature proves a receipt wasn't altered after being shown to you. It does not prove PayReality showed you *all* the receipts, or didn't quietly decline to issue one, or didn't backdate one. This is the actual weakness in treating "cryptographic integrity" as sufficient (as the original framing implicitly does) — **integrity and completeness are different properties, and only the second one delivers "you don't need to trust PayReality's mutable database."**

The fix, and the one substantive architectural addition this RFC makes beyond the brief: **a periodically published, append-only transparency log**, modeled on Certificate Transparency rather than on a blockchain (no consensus mechanism is needed — there's one issuer; what's needed is *public commitment*, not decentralization). On a fixed schedule (e.g. daily), all newly issued receipts across all tenants are batched into a Merkle tree, and the tree's root hash is published somewhere PayReality cannot quietly edit after the fact — a customer-controlled read-only mirror, a neutral timestamping authority (RFC 3161), or, at minimum, the root hashes co-signed by an independent auditor on a recurring basis. Once a root is published, every receipt in that batch carries an inclusion proof that anyone can check against the published root without calling PayReality at all. Omitting, backdating, or altering a receipt after its batch is published becomes cryptographically detectable, not just contractually prohibited.

Without this, "independent verification" is really "verification that PayReality hasn't shown you a tampered copy of whatever PayReality decided to show you" — a meaningfully weaker claim than the one this system is meant to make.

**Who signs:** PayReality's Runtime Authority, per-tenant signing key, key-transparency-logged.
**Who verifies:** Anyone holding a receipt and the (small, public) verification toolkit — no special relationship with PayReality required for shallow verification; a customer-granted disclosure required for deep verification.
**Who consumes:** The Evidence Portal (primary, human); auditors and regulators (export-and-verify); insurers and enterprise counterparties (export-and-verify, likely shallow-only); eventually, other systems, machine-to-machine (§12).

**Remaining assumptions this RFC does not resolve:** the correctness of the Decision Engine itself is a software-verification problem, not a receipt-architecture problem, and is explicitly out of scope here. The long-term cryptographic assumption (today's signature schemes remain hard to forge) is a multi-decade bet common to every system with this RFC's "years later" ambition, and is flagged, not solved, in §11.

## 9. Evidence Portal Evolution

**What changes:** the portal's data model shifts from "query decisions" to "query receipts" — search, filtering, and export all operate over the receipt as the unit, not the underlying decision row. Export becomes a first-class action, not an afterthought: "export this receipt bundle, verifiable offline" should be as prominent as "view this decision." The verify-signature action that exists today evolves into a genuine two-tier verification flow (§7) — a customer or auditor can run shallow verification directly in the portal, and request a deep-verification disclosure package when they need the stronger guarantee.

**What stays the same:** the portal remains the primary place a human goes to understand what happened — the workflow of finding a decision, reading its context, and understanding *why* it resolved the way it did doesn't change. Human Review's UI (approve/deny, reviewer name field, resolution reasoning) doesn't change either — it just now also produces a Resolution Receipt under the hood.

**How existing customers transition:** every Evidence record that predates this system remains valid evidence — nothing is invalidated. A backfill process can retroactively construct receipts for historical decisions where the necessary inputs (the decision's policy snapshot, intent, outcome) are still reconstructable from existing data, clearly marked as `backfilled: true` so nobody mistakes a reconstructed receipt for one that was chain-linked and transparency-logged in real time at the moment of decision. Where backfill isn't possible (data genuinely wasn't retained at that granularity), that's stated plainly as a gap, not silently patched over.

## 10. Migration Strategy

**Phase 1 — Current platform.** Evidence records as they exist today. No receipt concept yet. Baseline.

**Phase 2 — Receipt generation.** Decision Engine begins producing receipts per §6/§7 alongside existing Evidence records (dual-write). No customer-facing change yet. Purpose: prove the generation, signing, and chain-linking pipeline in production without betting the Evidence Portal on it.

**Phase 3 — Receipt-first portal.** Evidence Portal's UI and API switch to being receipt-backed. Existing Evidence records are backfilled into receipts (§9) where possible. This is the phase where the customer-visible product actually changes.

**Phase 4 — Independent verification.** Transparency log goes live: periodic Merkle root publication begins, inclusion proofs start attaching to receipts, and shallow/deep verification tooling ships (as a CLI/SDK, not just a portal button — verification should work with the receipt alone, offline, by design). This is the phase where the core promise of this RFC ("verify without trusting PayReality's live systems") becomes real rather than aspirational.

**Phase 5 — External integrations.** Insurer, regulator, and cross-enterprise consumption patterns (§12) build on top of a now-stable, versioned, externally-verifiable artifact. This phase is explicitly downstream of, and should not begin before, Phase 4 actually shipping — building integrations against a receipt format that hasn't yet earned independent verifiability would just be building against Phase-1 evidence with extra steps.

Each phase should be independently valuable and independently shippable — Phase 2 alone already improves auditability even if Phase 4 slipped a year, which is a deliberate hedge against this becoming an all-or-nothing bet.

## 11. Open Questions

These are genuinely unresolved, and this RFC does not attempt to answer them:

- **Cryptographic agility.** What is the actual plan for migrating signed historical receipts if/when current signature schemes are weakened (post-quantum concerns, for instance) within the "verified years later" time horizon this system is designed for? Re-signing old receipts contradicts immutability; not re-signing them means their long-term guarantee has a silent expiry date nobody has named yet.
- **Transparency log operator.** Should the log be operated by PayReality (simpler, but reintroduces a trust dependency this RFC is trying to remove), a neutral third party, or co-signed by customers themselves? Each has real cost and real trust trade-offs not resolved here.
- **Intent classification granularity (§6).** Is a single fixed disclosure level right, or does this need to be tenant-configurable per industry (healthcare vs. payments vs. procurement plausibly want different defaults)? Unresolved, and probably shouldn't be resolved unilaterally by engineering.
- **Cross-tenant chain scope.** The hash chain in §6/§8 is scoped per-tenant. Is there a future need for cross-tenant or platform-wide chain integrity (e.g., for PayReality's own audit purposes), and if so, does that create privacy tension with per-tenant isolation?
- **Backfill completeness guarantees.** For historical data where backfill (§9) is only partially possible, what's the actual disclosure obligation to a customer about which of their old decisions have full-strength receipts versus reconstructed ones?
- **Who bears the cost of long-term storage** for "keep forever" receipts and their proofs, at what point (if any) does per-tenant retention configuration override the "forever" default, and what happens to verifiability if a customer offboards from PayReality entirely?

## 12. Future Extensions

Only extensions that follow directly from an already-portable, independently-verifiable artifact — not a wishlist:

- **Cross-enterprise verification.** Once a receipt is a self-contained artifact, a counterparty enterprise (a vendor, a customer's customer) can verify "this agent's action was authorized" without any relationship with PayReality at all — this falls out of §8's design essentially for free.
- **Insurance integrations.** An insurer underwriting AI-operational risk can request a shallow-verification export as evidence of governance maturity, without needing operational access — a natural product surface once export/verify tooling (Phase 4) exists.
- **Regulatory submissions.** A receipt bundle is a plausible unit for direct regulatory filing in AI-governance-regulated industries, precisely because it doesn't require the regulator to take PayReality's word for anything beyond the published transparency log.
- **Compliance evidence exchange.** Two organizations using PayReality (or, eventually, a compatible standard — see below) could exchange authorization evidence for a shared workflow without either exposing their internal systems to the other.
- **Third-party verification services.** Once the format is stable and documented, nothing stops an independent verification-as-a-service tool from existing, the same way TLS certificate checkers exist independent of any single CA.
- **Standardization.** If Authorization Receipts prove out, the natural end state is publishing the schema as an open specification — the value of "independently verifiable by anyone" scales with how many parties can verify without adopting PayReality-specific tooling. This should be considered a multi-year outcome, not a v1 goal — a standard proposed before the format has survived real-world revision is usually a standard that gets revised anyway, just with more process overhead.

Explicitly **not** included here because it doesn't follow from this architecture: execution attestation (§4), decision-engine-correctness proofs (§8), and anything resembling a public blockchain for receipt storage (the transparency-log design in §8 gets the relevant property — public, tamper-evident commitment — without decentralized consensus, which nothing in this problem actually requires).

## 13. Design Principles

1. **Runtime Authority decides. Authorization Receipts preserve. The Evidence Portal presents.** Three distinct responsibilities; no future change should collapse them back into one.
2. **Verification should not depend on trusting mutable infrastructure.** A signature is necessary. It is not, by itself, sufficient — completeness matters as much as integrity (§8).
3. **Organizations retain ownership of governance.** PayReality operationalizes Delegation of Authority; it does not become the authoritative source of it.
4. **Authorization should be deterministic and, where disclosed, replayable.** "Trust the signature" is the floor. "Recompute the answer yourself" is the ceiling this architecture should keep reaching for.
5. **Evidence should be portable and should degrade gracefully.** A receipt that requires PayReality to be reachable, solvent, or even still in business to remain meaningful has failed the actual point of this exercise.
6. **Disclosure is minimal by default and explicit by choice.** The customer decides what gets shown to whom; the platform's default should never be the maximally revealing one.
7. **Corrections are additive. History is not edited.** A receipt found to be wrong, superseded, or issued under a since-revoked key gets a linked successor, never a rewrite.
8. **Every field in the receipt must justify itself against verification or privacy — nothing else.** Convenience fields belong in the database behind the receipt, never in the trust-bearing artifact itself.
