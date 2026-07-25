# Go Live

This documents what was actually done to take the backend live, and the one remaining step that only a human with Namecheap access can complete. Where a previous version of this file described a Blueprint-dashboard procedure that hadn't been executed yet, this version replaces it with what was, once a Render API key made real execution possible.

For ongoing operation (monitoring, rollback, incident response), see `OPERATIONS_RUNBOOK.md`. For the full requirement-by-requirement readiness state, see `PRODUCTION_CHECKLIST.md`.

## Current status

| Step | Status |
|---|---|
| Backend code, tests, Dockerfile | Done. 36/36 tests passing. |
| Render account | Exists, connected via API key. |
| Postgres | Live: existing free-tier `payreality-db` instance, adopted rather than re-provisioned. Expires 2026-08-24 (Render free-tier 30-day limit); re-provision or upgrade before then. |
| OPA | Live, embedded in the same container as the API (`server/entrypoint.sh`), bound to loopback only. |
| Backend reachable at a public URL | **Yes: `https://payreality-api.onrender.com`**, verified live (`/health`, `/health/ready`, `/version` all confirmed returning correct real data). |
| Full Runtime Authority pipeline | **Verified end-to-end against production** via `scripts/smoke_test.py`: real Principal, real Agent with a real ED25519 keypair, a real signed Intent evaluated by the real embedded OPA, a real cryptographically-verified Evidence record, the public verification key confirmed reachable, real Assurance counts. 9/9 stages passed. |
| Frontend `VITE_API_URL` | Set to `https://payreality-api.onrender.com` in Vercel (production), confirmed baked into the live production JS bundle. |
| Custom domain `api.aisecurewatch.com` | Registered on the Render service (`cdm-d9idmt7aqgkc739ubtr0`), status `unverified`, waiting on DNS. |
| DNS record | **Not yet added.** This is the one remaining step; only a human with Namecheap access can do it (no Namecheap credentials exist in this environment). See below. |

## Why this deployment uses one free web service, not the original Render Blueprint

The first attempt followed the originally-planned topology (a separate private OPA service, a paid Postgres) and hit a real, immediate wall: Render's private services have no free tier at all, confirmed by a `402 Payment Required` when actually attempting to create one, with no payment method on the account. Re-planned for zero additional cost (see `DEPLOYMENT.md`'s zero-cost section and the commit that re-architected this): OPA now runs embedded in the same container as the API, and the existing free Postgres instance is reused rather than provisioning a new paid one. `render.yaml` reflects this simplified topology.

The actual deploy was done directly against Render's REST API (`https://api.render.com/v1`), not by importing `render.yaml` as a Blueprint through the dashboard, since Blueprint import requires the Render GitHub App to already have repository access, which wasn't set up. `render.yaml` stays in the repo as the documented, re-appliable equivalent for whoever wants to manage this via Render's Blueprint feature going forward.

## What to do next: the one remaining step

**Add this DNS record wherever `aisecurewatch.com`'s DNS is actually managed (confirmed via `vercel domains inspect aisecurewatch.com` to still be the registrar's nameservers, not Vercel's):**

| Field | Value |
|---|---|
| Type | `CNAME` |
| Host / Name | `api` |
| Value / Target | `payreality-api.onrender.com` |
| TTL | Automatic / default |

After adding it:

1. Wait for propagation (usually minutes; can take longer depending on the registrar and any prior TTLs on that name).
2. Confirm: `curl -I https://api.aisecurewatch.com/health` returns `200`.
3. Render issues and renews the TLS certificate for the domain automatically once DNS resolves correctly; no separate certificate step.
4. Once confirmed, update the frontend's `VITE_API_URL` (currently `https://payreality-api.onrender.com`) to `https://api.aisecurewatch.com` instead, and update `CORS_ORIGIN` if the frontend's own origin ever changes too. Re-run `scripts/smoke_test.py` against the new domain as the final confirmation.

## Acceptance criteria

- [x] Backend publicly reachable at a real URL (`https://payreality-api.onrender.com`; `api.aisecurewatch.com` pending DNS above).
- [x] PostgreSQL hosted and reachable (`/health/ready`'s `database` check is `true`).
- [x] OPA operational (`/health/ready`'s `opa` check is `true`).
- [x] Runtime Authority executes real decisions (smoke test's intent-submission stage passed against production).
- [x] Evidence is cryptographically signed (smoke test's verify-evidence stage passed against production).
- [x] Evidence can be independently verified (`GET /v1/evidence/verification-key` confirmed reachable and populated).
- [x] Website communicates with the production API (confirmed the deployed frontend's JS bundle references the real backend URL).
- [ ] Backend reachable at `https://api.aisecurewatch.com` specifically: pending the DNS step above.
- [ ] Platform ready for enterprise pilot deployments: functionally yes for demonstrations; see `PRODUCTION_CHECKLIST.md`'s unchecked items (human auth, key rotation, the free-tier Postgres's 30-day expiry) before a real paying pilot's data goes anywhere near this.
