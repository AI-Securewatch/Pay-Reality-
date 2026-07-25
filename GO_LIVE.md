# Go Live

This documents what was actually done to take the backend live. Every step is complete. Where earlier versions of this file described unexecuted procedures or a pending DNS step, this version reflects the final, verified state.

For ongoing operation (monitoring, rollback, incident response), see `OPERATIONS_RUNBOOK.md`. For the full requirement-by-requirement readiness state, see `PRODUCTION_CHECKLIST.md`.

## Current status: live

| Step | Status |
|---|---|
| Backend code, tests, Dockerfile | Done. 36/36 tests passing. |
| Render account | Exists, connected via API key. |
| Postgres | Live: existing free-tier `payreality-db` instance, adopted rather than re-provisioned. Expires 2026-08-24 (Render free-tier 30-day limit); re-provision or upgrade before then. |
| OPA | Live, embedded in the same container as the API (`server/entrypoint.sh`), bound to loopback only. |
| Backend reachable at its Render URL | Yes: `https://payreality-api.onrender.com` (`/health`, `/health/ready`, `/version` all verified). |
| Custom domain `api.aisecurewatch.com` | **Live.** DNS added at the registrar, Render's domain verification triggered and confirmed `verified`, TLS certificate confirmed issued by Google Trust Services (`notAfter: Oct 23 2026`), all three endpoints confirmed serving real responses over HTTPS on this domain. |
| Frontend `VITE_API_URL` | Set to `https://api.aisecurewatch.com` in Vercel (production), confirmed baked into the live production JS bundle, confirmed via a fresh production deploy. |
| Full Runtime Authority pipeline | **Verified end-to-end against `https://api.aisecurewatch.com` itself** via `scripts/smoke_test.py`: real Principal, real Agent with a real ED25519 keypair, a real signed Intent evaluated by the real embedded OPA, a real cryptographically-verified Evidence record, the public verification key confirmed reachable, real Assurance counts. 9/9 stages passed. |

## Why this deployment uses one free web service, not the original Render Blueprint

The first attempt followed the originally-planned topology (a separate private OPA service, a paid Postgres) and hit a real, immediate wall: Render's private services have no free tier at all, confirmed by a `402 Payment Required` when actually attempting to create one, with no payment method on the account. Re-planned for zero additional cost (see `DEPLOYMENT.md`'s zero-cost section): OPA runs embedded in the same container as the API, and the existing free Postgres instance is reused rather than provisioning a new paid one. `render.yaml` reflects this simplified topology.

The actual deploy was done directly against Render's REST API (`https://api.render.com/v1`), not by importing `render.yaml` as a Blueprint through the dashboard, since Blueprint import requires the Render GitHub App to already have repository access, which wasn't set up. `render.yaml` stays in the repo as the documented, re-appliable equivalent for whoever wants to manage this via Render's Blueprint feature going forward.

## What actually happened during the custom-domain cutover, including a real transient issue

1. Custom domain `api.aisecurewatch.com` registered on the Render service via the API.
2. DNS record added at the registrar (`CNAME api -> payreality-api.onrender.com`).
3. Render's domain verification was triggered explicitly via its API rather than waiting on a schedule, and confirmed `verified` shortly after.
4. Right after the *initial* Render service deploy (before the custom domain existed), `/health` and `/version` intermittently returned a plain-text 404 from Cloudflare's edge rather than the app. Checked the application's own logs before assuming anything: zero errors, 100% success on every internal health probe the whole time, ruling out a crash-loop. This was Cloudflare edge propagation lag for a brand-new `*.onrender.com` subdomain, confirmed by polling until it stabilized (15/15 clean), and not something that recurred during the later custom-domain cutover.
5. TLS certificate for `api.aisecurewatch.com` verified directly with Python's `ssl` module, not just a successful `curl`: issued by Google Trust Services, `subjectAltName` matches the domain exactly, valid through October 2026.
6. Frontend's `VITE_API_URL` updated from the interim Render URL to `https://api.aisecurewatch.com`, a fresh production deploy triggered, and the deployed JS bundle checked directly to confirm the new URL is actually what shipped.
7. Full smoke test re-run against `https://api.aisecurewatch.com` itself (not just the interim Render URL) as the final confirmation: 9/9 stages passed.

## Acceptance criteria

- [x] Backend publicly reachable at `https://api.aisecurewatch.com`.
- [x] PostgreSQL hosted and reachable (`/health/ready`'s `database` check is `true`).
- [x] OPA operational (`/health/ready`'s `opa` check is `true`).
- [x] Runtime Authority executes real decisions (smoke test's intent-submission stage passed against `api.aisecurewatch.com`).
- [x] Evidence is cryptographically signed (smoke test's verify-evidence stage passed against `api.aisecurewatch.com`).
- [x] Evidence can be independently verified (`GET /v1/evidence/verification-key` confirmed reachable and populated on the live domain).
- [x] Website communicates with the production API (confirmed the deployed frontend's JS bundle references `api.aisecurewatch.com`, and the full pipeline works through it).
- [x] Backend reachable at `https://api.aisecurewatch.com` specifically, with valid SSL.
- [ ] Platform ready for enterprise pilot deployments with real customer data: functionally yes for demonstrations and pilot conversations today; see `PRODUCTION_CHECKLIST.md`'s remaining unchecked items (human auth, evidence key rotation, and upgrading off the free-tier Postgres before it expires 2026-08-24 and the free web service's cold-start behavior) before a real paying pilot's data goes anywhere near this.
