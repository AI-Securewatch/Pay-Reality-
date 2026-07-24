# Version 3 Roadmap

Phased by how far along the company actually is, not by feature wishlist. Nothing here is scoped because a competitor has it — everything here is scoped because a specific, named next milestone (a pilot, a seed round, a Series A) genuinely requires it.

## Immediate (next few weeks)

Everything needed to take what exists today from "runs locally, passes tests" to "a real person outside this codebase can use it."

- **Deploy the backend.** Provision Postgres + OPA + the API on Render (see DEPLOYMENT.md for the full reasoning). Nothing else in this roadmap matters until this is real.
- **Point the frontend at it.** Set `VITE_API_URL` as a real Vercel environment variable; confirm CORS and the operator-key flow work against the live backend, not just `TestClient`.
- **Generate and store the real production secrets.** A real `EVIDENCE_SIGNING_KEY_B64` and `ADMIN_API_KEY`, generated once, backed up as carefully as the database (losing the signing key makes all historical Evidence permanently unverifiable).
- **Wire CI to deploy**, not just build — Render's GitHub integration once the host exists.

## Enterprise Pilot (first real customer)

What's required to run this with one paying/piloting enterprise customer's actual data, not synthetic test data.

- **Human authentication for the operator side** — even a minimal single-sign-on or per-person login replacing the shared `ADMIN_API_KEY`, so `resolved_by` on a decision resolution is a real, accountable identity instead of free text. This is the single highest-priority item in this phase: an enterprise pilot customer will ask "who approved this" and free text is not an acceptable answer.
- **Evidence signing key registry**, so the key can be rotated without breaking verification of everything signed before the rotation (see SECURITY.md's evidence-integrity section for exactly why this can't be retrofitted casually).
- **Design token unification** between this app and the marketing site (`PayReality website` repo) — they currently use different CSS custom properties (`--pr-authority-blue: #4D7CFE` here vs. `#7c6fff`/`#3b8cf8` on the marketing site) that happen to look similar by coincidence, not shared source. A pilot customer moving between the marketing site and the product should see one brand, not two that almost match.
- **Real document intelligence, hardened.** The Claude-backed extraction provider already exists (`domain/extraction/claude_provider.py`); this phase is about handling its failure modes for a real, messy delegation-of-authority PDF, not just the fallback provider's clean synthetic case.
- **Database backup verification** — not just enabled, but a documented, tested restore procedure, exercised at least once against a copy before the first real customer's data is at stake.

## Seed Ready

What an investor doing real technical diligence, not just a product demo, needs to find.

- **Exportable, independently-verifiable evidence bundles.** Today an auditor can verify one Evidence record's signature via the published public key. This phase adds a bundle export (a signed manifest covering a date range or a specific Decision's full chain) — the artifact an insurer or auditor actually asks for, not just an API response.
- **Hash-chained Evidence** — closing the gap named in SECURITY.md where consecutive Evidence records aren't cryptographically linked, making the ledger genuinely append-only and tamper-evident as a sequence, not just record-by-record.
- **A second real enterprise integration** — an actual IAM connector (so Agent/Principal identity ties into a customer's existing directory) or ERP connector (so Intents can originate from a real system, not just this app's own test-intent UI). One real integration proves the architecture generalizes; zero proves nothing either way.
- **A named pilot customer reference** — ideally from the CIO-assessment target profile identified in the earlier reconciliation audit — willing to be cited, not just a logo on a slide.

## Series A Ready

What changes once there's more than one customer and the infrastructure has to hold multiple mutually-distrusting tenants at once.

- **Multi-tenancy with real row-level isolation** — today's single-shared-tenant model (no per-principal access control beyond the operator key) stops being correct the moment a second customer's data lives in the same database. This is a real architectural change, not a config flag.
- **Move to the Series-A-scale hosting topology** in DEPLOYMENT.md — AWS or Azure, VPC-isolated, Secrets Manager/Key Vault (ideally HSM-backed for the signing key), Multi-AZ Postgres.
- **SOC 2 Type II** (or the customer base's equivalent requirement) — achievable at this stage specifically because the security posture in SECURITY.md is already honestly documented; retrofitting compliance onto undocumented gaps is much harder than documenting gaps honestly from the start, which is why this roadmap and SECURITY.md were written the way they were.
- **Rate limiting and session state moved to shared infrastructure** (Redis or equivalent) — the in-process limiter noted throughout this pass stops being sufficient the moment there's more than one backend instance, which multi-tenant scale requires.

## Long-term Platform Horizon

The reconciliation's own end state, referenced in the prior audit and execution report: one company, one shared domain model, one shared design system across the marketing site and the product — so the drift the original audit found (conceptual, structural, and visual divergence between "the vision" and "the implementation") cannot recur by construction, not just by discipline. A monorepo or a shared package boundary between the two repos is the concrete mechanism; the goal behind it is that there is only ever one source of truth for what PayReality is, expressed consistently whether a visitor is reading the marketing site or operating the actual product.
