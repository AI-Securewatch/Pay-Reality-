# Part 21 — Founder Learning Guide

**Supersedes/synthesizes:** the in-app contextual help system ([03_FRONTEND.md](03_FRONTEND.md) §3.10) covers day-to-day operational "how do I do X" questions; this part covers the deeper "what is this and why does it work this way" question, for a founder who needs to be able to discuss, defend, and eventually help redesign this platform without necessarily reading Python or Rego fluently.

## 21.1 The five words you need before anything else

Before reading any code, internalize the five primitives from [01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) §1.3: **Agent, Authority, Runtime Policy, Decision, Evidence.** Every conversation about this platform — with an engineer, an investor, an auditor, a customer — collapses back to these five words. If a sentence about this product doesn't map cleanly onto one of them, either the sentence needs to be sharpened or you've found a genuine gap worth asking about.

A useful test: can you explain, in one breath, "an Agent submits an Intent, which is checked against the active Runtime Policy, producing a Decision, which is recorded as signed Evidence"? Once that sentence is automatic, everything else in this specification is detail on top of it.

## 21.2 A non-technical mental model for "why OPA, not another AI model"

You do not need to understand Rego to understand why it's there. The analogy that holds up: a bank's fraud rules engine doesn't ask a second employee "does this transaction feel okay to you" — it runs the transaction against a fixed, auditable rulebook, and anyone can later point to the exact rule that fired. PayReality's Decision Engine is that rulebook, compiled from policies a human actually approved. This is why "deterministic" keeps appearing in this specification ([01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) §1.6) — it's not a technical preference, it's the entire reason a signed Decision record is worth anything to an auditor or insurer.

## 21.3 A non-technical mental model for "why signed and chained, not just logged"

A log file can be edited. A signed record can be forged only by someone holding the private key (which this platform never exposes — see [13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md) §13.1). A *chained* signed record additionally reveals if one was ever deleted or reordered, the way a chain of wax seals on a stack of letters would show a missing letter even if every remaining seal is intact. When you're in a room with a CISO or an insurer, this is the one paragraph worth memorizing.

## 21.4 Recommended reading order, and why

1. **[01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md)** — the five primitives and the pitch, in your own vocabulary already.
2. **[02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md)** — the diagrams here are worth studying even if the surrounding text is technical; a picture of "frontend → backend → Postgres/OPA" will carry you through most conversations.
3. **[15_USER_JOURNEYS.md](15_USER_JOURNEYS.md)** — read this before any of the deep-dive parts (7–14). Seeing how an Owner, an Agent Admin, a Governance Admin, a Reviewer, an Auditor, and an Executive each actually use the product grounds every subsequent technical part in a concrete "who does this and why."
4. **[16_CURRENT_LIMITATIONS.md](16_CURRENT_LIMITATIONS.md)** — read this earlier than its number suggests. Knowing what's genuinely not built yet protects you from ever overclaiming to a customer, investor, or auditor — the single most reputation-costly mistake this document's own operating principle ([01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) §1.7) warns against.
5. Only then, the deep dives (Parts 7–14) — in whatever order matches whatever conversation you're actually preparing for (a security review pulls you toward 14; a product demo pulls you toward 7, 9, 10, 11).
6. **[20_ARCHITECTURAL_ASSESSMENT.md](20_ARCHITECTURAL_ASSESSMENT.md)** — read this last, and read it as the honest version of "what would a technical co-founder or a due-diligence engineer actually flag." It is written to be that.

## 21.5 Questions worth being able to answer cold

- *"What stops an agent from doing something it shouldn't?"* → A compiled, deterministic policy a human approved, evaluated before the action happens, never after ([01_PRODUCT_OVERVIEW.md](01_PRODUCT_OVERVIEW.md) §1.1).
- *"What happens if you're not sure?"* → It never defaults to allow. Anything uncertain — a timeout, an error, no matching policy, an ambiguous result — becomes `HUMAN_REVIEW` ([12_DECISION_ENGINE.md](12_DECISION_ENGINE.md) §12.5).
- *"How do I know the record wasn't changed after the fact?"* → It's cryptographically signed at creation and chained to the record before it; a third party can check both using only a published public key, without trusting this company's servers at all ([13_EVIDENCE_ENGINE.md](13_EVIDENCE_ENGINE.md)).
- *"What isn't built yet?"* → Read [16_CURRENT_LIMITATIONS.md](16_CURRENT_LIMITATIONS.md) and answer specifically, not generally. "We're honest about our gaps" is a claim you can only make credibly if you can actually name them.
- *"What would break if you got 100x more customers tomorrow?"* → Single-instance rate limiting and embedded OPA, most immediately ([16_CURRENT_LIMITATIONS.md](16_CURRENT_LIMITATIONS.md), [20_ARCHITECTURAL_ASSESSMENT.md](20_ARCHITECTURAL_ASSESSMENT.md) §20.2) — both are known, scoped, and not architecturally hard to fix, but neither is fixed today.

## 21.6 How to keep this guide, and this whole specification, from going stale

The single concrete lesson [00_INDEX.md](00_INDEX.md) and [16_CURRENT_LIMITATIONS.md](16_CURRENT_LIMITATIONS.md) both demonstrate: a design document's stated status is not the same as the code's actual status, and the gap between them grows the moment either changes without the other being updated. The cheapest protection against this specification itself going stale the way the twelve Phase docs did: whenever a phase or major feature ships, update this specification's relevant part in the same pull request, not as a follow-up. A specification that's 90% accurate and known to be so is far more useful than one that's silently 60% accurate and assumed to be current.
