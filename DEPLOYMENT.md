# Deployment

## Honest status, first

The frontend is live on Vercel today. **The backend is not hosted anywhere yet.** It runs correctly locally (36 passing unit tests, manually verified request/response behavior; see the smoke-test evidence in the V3 execution notes), and it is packaged to deploy (`server/Dockerfile`, `docker-compose.yml`, this document), but nobody has provisioned a live database, a live OPA instance, or a live copy of the API on a real host. This document is the recommendation and the runbook for doing that; it is not a claim that it's already done. Provisioning real cloud infrastructure requires an account and billing decision that has to be the customer's/founder's, not something to fabricate.

## Hosting recommendation

### Now (pilot phase): Render

| Requirement | Why Render fits |
|---|---|
| Managed Postgres | Render's managed Postgres handles backups, point-in-time recovery, and connection pooling without separate provisioning. |
| Docker web service | `server/Dockerfile` deploys as-is: no adaptation needed. |
| Private networking | OPA deploys as a second private service, reachable only from the API service, never from the public internet (see SECURITY.md; this matters because OPA's HTTP API has no auth of its own). |
| Ops overhead proportionate to stage | A single named pilot customer doesn't justify a multi-AZ, VPC-segmented, Kubernetes-orchestrated deployment yet. Render's git-push-to-deploy model keeps iteration fast without a dedicated DevOps hire. |
| Enterprise-credible | Established, audited (SOC 2 Type II), used in production by companies of comparable and larger stage. A CIO diligence-checking the hosting choice won't flag it. |

**Alternatives considered:** Railway (comparable simplicity, historically less production-track-record for enterprise diligence); Fly.io (better for globally-distributed low-latency needs this product doesn't have yet); a bare AWS/Azure VM (more control, no matching increase in value at this stage: pure overhead).

### Series A / scale: AWS or Azure

Whichever the majority of actual enterprise pilot customers already standardize on (worth asking rather than presuming), this is the point where infrastructure choices should follow the customer's compliance requirements, not the other way around:

- **Compute**: ECS Fargate (AWS) or Container Apps (Azure), same container images built here, no rewrite.
- **Database**: RDS Multi-AZ Postgres (AWS) or Azure Database for PostgreSQL Flexible Server, with automated backups and a read replica once read load justifies it.
- **Secrets**: AWS Secrets Manager / Azure Key Vault for `EVIDENCE_SIGNING_KEY_B64` and `ADMIN_API_KEY`, ideally with the evidence signing key backed by a real HSM (KMS asymmetric signing key or Azure Key Vault HSM-backed key) rather than an env var, once the roadmap's key-rotation work lands (see VERSION_3_ROADMAP.md and SECURITY.md).
- **Networking**: private VPC/VNet, OPA and Postgres with no public IP at all, API behind an ALB/Application Gateway with WAF.

Don't build this before there's a customer whose procurement process requires it: it's real infrastructure debt either way, but taking it on early has no payoff yet.

## Environment variables

See `server/.env.example` for the authoritative, current list. Summary:

| Variable | Required in production | Notes |
|---|---|---|
| `ENVIRONMENT` | yes (`production`) | Enables strict boot-time validation (below) and HSTS. |
| `DATABASE_URL` | yes | `postgresql+psycopg://...`. Must point at the managed Postgres instance, not localhost. |
| `OPA_URL` | yes | Must be a private-network address, never public. |
| `EVIDENCE_SIGNING_KEY_B64` | yes | Generate once, store in the host's secret manager, never commit it. Losing this key means all historical Evidence becomes unverifiable; back it up as carefully as the database itself. |
| `EVIDENCE_SIGNING_KEY_ID` | yes | Human-readable identifier for the current key; changes only on a deliberate rotation (see roadmap). |
| `ADMIN_API_KEY` | yes | The operator credential: generate with `secrets.token_urlsafe(32)`, rotate if it ever leaks. |
| `ANTHROPIC_API_KEY` | recommended | Without it, document extraction falls back to a deterministic stub rather than real AI extraction: fine for testing, not for a real pilot document. |
| `INTENT_SIGNATURE_WINDOW_SECONDS` | no (default 300) | Widen only if agent clock skew is a known issue; narrowing tightens replay protection. |
| `CORS_ORIGIN` | yes | The frontend's real deployed origin. Refusing to boot with the `localhost` default in production is enforced in code (`app/main.py::_validate_production_config`). |
| `VITE_API_URL` (frontend, Vercel env var) | yes | The backend's real public URL. The frontend build fails closed to `/api` if unset, which will silently 404 in production if there's no matching Vercel rewrite, so this must be set explicitly for any real deploy. |

**Boot-time validation**: `server/app/main.py::_validate_production_config` refuses to start at all if `ENVIRONMENT=production` and any of `EVIDENCE_SIGNING_KEY_B64`, `ADMIN_API_KEY`, or a real `CORS_ORIGIN` are missing or left at their dev defaults. A misconfigured production deploy fails immediately and loudly, not partway through serving degraded traffic.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`: the full pytest suite, a Docker build of the server image (build-only, no registry push configured yet, since there's no deploy target to push *to*), and the frontend Vite build. Wiring an actual deploy step (Render's GitHub auto-deploy, or a `docker push` + Render/ECS deploy hook) is a five-minute addition once a host is chosen and provisioned; it's deliberately not built ahead of having somewhere to point it.

Recommended flow once a host exists: Render's native GitHub integration (deploy on push to `main` after CI passes) rather than a custom deploy script, one less thing to maintain.

## Migrations

Alembic, `server/alembic/`. `server/Dockerfile`'s `CMD` runs `alembic upgrade head` before starting `uvicorn`: a failed migration aborts the container start rather than serving traffic against a schema it doesn't match. For a zero-downtime deploy with more than one instance, this needs to change to a separate migration step that runs once before the new instances start (Render's "pre-deploy command," or a dedicated migration job) rather than running redundantly in every instance's entrypoint.

## Rollback

- **Application code**: redeploy the previous image tag/commit. No database migration is required for most rollbacks since Alembic migrations here are additive to date.
- **Policy**: reactivate the previously-active Policy version via `POST /v1/policies/{id}/activate`; this *is* the rollback mechanism, not a separate feature (see ARCHITECTURE.md).
- **Database schema**: `alembic downgrade -1`, tested against a staging copy first. Not yet exercised against production data because there is no production database yet: do this exercise before the first real migration that isn't purely additive.

## Monitoring, logging, backups

- **Logging**: structured JSON to stdout (`app/logging_config.py`), one line per request (`app/security.py::observability_middleware`) including a request id, method, path, status, and duration. Ready to ship to any log aggregator that reads stdout (Render's built-in log viewer today; a real aggregator like Axiom/Datadog once volume justifies it).
- **Health/readiness**: `/health` (liveness, no dependency calls) and `/health/ready` (checks Postgres and OPA live, 5-second connect timeout so a down dependency fails fast instead of hanging the check itself; a real bug caught and fixed while building this: the original readiness check had no connect timeout and could hang indefinitely against an unreachable database). Point the host's health check at `/health` and any alerting/orchestration logic that should avoid routing traffic at `/health/ready`.
- **Backups**: Render managed Postgres includes automated daily backups + point-in-time recovery on paid tiers; enable this explicitly when the database is provisioned, don't assume a default tier includes it.
- **SSL/domains**: Render (and Vercel, already) issue and renew TLS automatically for custom domains; no manual certificate management needed at this stage.

## Scaling

Not a near-term concern at pilot volume. When it is: the rate limiter is in-process memory (correct for one instance, a no-op across several; see ARCHITECTURE.md's known gaps), and the database connection pool (`server/app/db/session.py`) would need pool-size tuning under real concurrent load. Both are cheap, well-understood fixes to make when there's actual traffic to justify them, not before.
