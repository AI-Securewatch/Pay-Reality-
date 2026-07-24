# Go Live

This is the one-time bring-up procedure: the exact steps to take the backend from "packaged to deploy" to "actually live at `https://api.aisecurewatch.com`." It is written to be followed literally, step by step, by whoever has the Render account and registrar access, since neither exists in the environment this was written in.

For ongoing operation after go-live (monitoring, rollback, incident response), see `OPERATIONS_RUNBOOK.md`. For the full requirement-by-requirement readiness state, see `PRODUCTION_CHECKLIST.md`.

## Current status (as of this writing)

| Step | Status |
|---|---|
| Backend code, tests, Dockerfile, `render.yaml` | Done. 36/36 tests passing. |
| Render account | Not created / not connected here. |
| Postgres provisioned | No. |
| OPA deployed | No. |
| API reachable at any public URL | No. |
| DNS for `api.aisecurewatch.com` | Not pointed anywhere; `aisecurewatch.com` is still on its registrar's nameservers, not Vercel's. |
| Frontend `VITE_API_URL` | Still unset / pointing nowhere real. |

Nothing below this line has been executed. It is the procedure, not a record of what happened.

## Step 1: Create the Render Blueprint

1. Log in to Render, connect the `AI-Securewatch/Pay-Reality-` GitHub repo.
2. New → Blueprint → select this repo → Render reads `render.yaml` from the repo root.
3. Review the plan Render proposes (`payreality-db`, `payreality-opa`, `payreality-api`) and apply it.
4. Render will prompt for the two secrets marked `sync: false` in `render.yaml`:
   - `EVIDENCE_SIGNING_KEY_B64`: generate it, don't reuse any key from local testing:
     ```
     python -c "import nacl.signing, base64; print(base64.b64encode(bytes(nacl.signing.SigningKey.generate())).decode())"
     ```
     Store this value somewhere durable outside Render too (a password manager, a secrets vault). Losing it makes every future Evidence record unverifiable and makes every *past* one unverifiable too, the moment it's ever rotated without a key registry (see `SECURITY.md`).
   - `ANTHROPIC_API_KEY`: your real Anthropic key, for document extraction. Leaving this blank is fine; extraction falls back to a deterministic stub rather than failing, but that stub is not real AI extraction of an actual delegation-of-authority document.
5. `ADMIN_API_KEY` is generated automatically by Render (`generateValue: true`). After the first deploy, copy it from the Render dashboard (Environment tab) and store it the same way as the signing key. This is the operator credential every policy-mutation and decision-resolution call needs (see `docs/API_SPECIFICATION.md`'s auth table).

## Step 2: Verify the first deploy

1. Watch the `payreality-api` service's deploy log. The Dockerfile's `CMD` runs `alembic upgrade head` before starting `uvicorn`; a migration failure aborts the deploy rather than serving traffic against a mismatched schema, so a healthy deploy log is itself the first schema-integrity check.
2. Once deployed, hit the Render-assigned URL directly (e.g. `https://payreality-api.onrender.com/health`) and confirm `{"status":"ok"}`.
3. Hit `/health/ready` and confirm `{"ready": true, "checks": {"database": true, "opa": true}}`. If `opa` is `false`, check the `payreality-opa` private service is in the same region and that `OPA_URL` resolved correctly (Render's `fromService` env var wiring in `render.yaml` should have handled this automatically).

## Step 3: Add the custom domain

Render's Blueprint format doesn't take custom domains, this is a manual step every time a Blueprint-deployed service needs one:

1. Render dashboard → `payreality-api` service → Settings → Custom Domain → add `api.aisecurewatch.com`.
2. Render will show a CNAME target (something like `payreality-api.onrender.com`).
3. Add that CNAME at whichever registrar currently holds `aisecurewatch.com`'s DNS (as of this writing, that's the registrar directly, not Vercel, confirmed by checking `vercel domains inspect aisecurewatch.com`, which shows the live nameservers are still the registrar's, not `ns1/ns2.vercel-dns.com`). If DNS ever gets migrated to Vercel instead, the same CNAME can be added there.
4. Wait for DNS propagation (usually minutes, sometimes longer depending on the registrar and prior TTLs), then confirm: `curl -I https://api.aisecurewatch.com/health` returns `200`.
5. Render issues and renews the TLS certificate for the custom domain automatically once DNS resolves correctly, no manual certificate work needed.

## Step 4: Connect the frontend

1. In the Vercel dashboard for the `pay-reality-demo` project, set the `VITE_API_URL` environment variable (Production environment) to `https://api.aisecurewatch.com`.
2. Trigger a redeploy (Vercel rebuilds on the env var change, or push an empty commit / use "Redeploy" in the dashboard, since `VITE_API_URL` is inlined at build time, not read at runtime).
3. Confirm `CORS_ORIGIN` on the Render side (`render.yaml`) actually matches the frontend's real production origin. It's currently set to `https://pay-reality-demo.vercel.app`; update it if the frontend has since moved to a different domain (e.g. a future `app.aisecurewatch.com`).
4. Open the live frontend and confirm the "Backend not reachable" warning on the Overview page is gone, and that Authority/Policy/Evidence/Assurance pages load real (even if empty) data instead of erroring.

## Step 5: Run the smoke test

```
pip install pynacl
PAYREALITY_API_URL=https://api.aisecurewatch.com \
PAYREALITY_OPERATOR_KEY=<the ADMIN_API_KEY from step 1.5> \
python scripts/smoke_test.py
```

This exercises the entire pipeline for real: creates a Principal and Agent, generates a real ED25519 keypair, signs and submits a real Intent, resolves it if it comes back `HUMAN_REVIEW` (expected with no active Policy yet), verifies the resulting Evidence's signature, and confirms the public verification key is published. Every stage prints `PASS` or `FAIL`; the script exits non-zero on any failure, so it's safe to wire into CI as a post-deploy gate later.

Its HTTP and signing mechanics were verified locally against a real running instance before this was written (confirmed `/health` returns 200, confirmed `/health/ready` correctly reports and times out in ~4.6 seconds against unreachable dependencies rather than hanging). The database-dependent stages (creating a Principal, submitting an Intent) could not be exercised end-to-end in that environment, since there was no live Postgres there; this run, against the real deployed instance, is the actual first full validation.

## Step 6: Confirm the acceptance criteria

Only mark these done once actually observed, not once attempted:

- [ ] Website communicates with the production API (Step 4.4).
- [ ] Backend publicly reachable at `https://api.aisecurewatch.com` (Step 3.4).
- [ ] PostgreSQL hosted (Render dashboard shows `payreality-db` healthy).
- [ ] OPA operational (`/health/ready`'s `opa` check is `true`).
- [ ] Runtime Authority executes real decisions (smoke test's intent-submission stage passes).
- [ ] Evidence is cryptographically signed (smoke test's verify-evidence stage passes).
- [ ] Evidence can be independently verified (fetch `/v1/evidence/verification-key` from a machine that has never talked to this backend before, and verify a known Evidence record's signature against it by hand, without calling `POST /verify`; this is the real test of independence, not just calling the API again).
- [ ] Platform ready for enterprise pilot deployments: all of the above, plus a read-through of `PRODUCTION_CHECKLIST.md` with nothing marked as an open blocker.
