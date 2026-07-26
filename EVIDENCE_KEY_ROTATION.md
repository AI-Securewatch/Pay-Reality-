# Evidence Key Rotation

## The gap this closes

Every Evidence record and every Agent Lifecycle audit event is signed with a single Ed25519 key (`EVIDENCE_SIGNING_KEY_B64`/`EVIDENCE_SIGNING_KEY_ID`). Before this change, verification (`evidence_service.verify_evidence`, `agent_service.verify_audit_event`) checked a stored signature against whatever key is *currently* configured, not the key that was actually active when that specific record was signed. `key_id` was stored on every record but never used to look anything up.

The practical consequence: rotating that key, for any reason including routine security hygiene, would have silently made every record ever signed under the previous key unverifiable. For a platform whose core pitch is "verify this independently, forever," that's not a minor gap; it's the one thing that made the pitch untrue the moment a rotation ever happened.

## The fix: a signing-key registry

A new table, `signing_keys` (`server/app/db/models.py::SigningKey`): `key_id` (the natural primary key, not a surrogate UUID; it's already how a key is identified everywhere else), `public_key_b64`, `created_at`, `retired_at` (null while active). Rows are never deleted, including retired ones, for the same reason no other evidentiary table in this schema deletes anything.

Verification now works like this: given a record's stored `key_id`, look up its public key in `signing_keys` (`signing_key_service.get_public_key_for_key_id`) and verify against *that* key, not the current one. A record signed five rotations ago still verifies correctly, because its `key_id` still resolves to the exact public key that was active when it was signed.

## How registration actually happens: no new endpoint required

`server/app/main.py`'s lifespan startup hook calls `signing_key_service.ensure_current_key_registered(db, settings.evidence_signing_key_id, public_key)` once, every time the app boots. That one function is the entire rotation mechanism:

- **First boot ever** (or first boot after this migration): the current key isn't registered yet, so it's inserted as the active row.
- **Every subsequent boot with the same key**: the key_id is already registered, this is a no-op.
- **A boot after an operator rotates the key** (changes `EVIDENCE_SIGNING_KEY_B64`/`EVIDENCE_SIGNING_KEY_ID` and redeploys): the new `key_id` isn't registered yet, so whichever row was previously active gets `retired_at` set to now, and the new key is inserted as the new active row.

This is idempotent and safe to run on every single process start, including in a multi-instance deployment (each instance's first boot after a rotation performs the same no-op-if-already-done registration).

## How to actually rotate the key, operationally

1. Generate a new Ed25519 signing key (same process as generating any other key in this codebase, e.g. `nacl.signing.SigningKey.generate()`, per `server/.env.example`'s own instructions).
2. Choose a new, distinct `EVIDENCE_SIGNING_KEY_ID` (it must not collide with any previous key_id; a timestamp or version suffix is a reasonable convention, e.g. `signing_key_2027_q1`).
3. Set both `EVIDENCE_SIGNING_KEY_B64` and `EVIDENCE_SIGNING_KEY_ID` to the new values in the deployment environment (Render dashboard).
4. Redeploy. The startup hook retires the old key and registers the new one automatically, with no manual database step and no API call required.
5. Confirm via `GET /v1/evidence/verification-keys`: the previous key should now show `retired_at` set, and the new key should show as `active: true`.

Nothing about signing new records changes: `intent_service.append_evidence` and `agent_service._append_audit_event` still just call `sign_payload(payload, settings.evidence_signing_key_b64, settings.evidence_signing_key_id)`, the current key, same as before this change.

## What's independently verifiable now, and how

`GET /v1/evidence/verification-key` (singular, unchanged) still publishes only the *currently active* key, for the common case of verifying a recent record. `GET /v1/evidence/verification-keys` (new, plural) publishes the entire history, active and retired, so a regulator, insurer, or auditor can verify any record regardless of how many rotations have happened since it was signed, entirely offline, without trusting this API's own `/verify` result.

## A defensive detail worth naming explicitly

`ensure_current_key_registered` checks: if a `key_id` is already registered but its stored public key doesn't match what's currently configured, it does **not** overwrite the row. It logs an error and leaves the registry untouched. A historical row's public key changing would mean either a key_id was reused with different material (a real operational mistake) or the registry itself was tampered with; silently "fixing" that by overwriting would defeat the entire point of the table (a historical key's public value must never change once recorded). This anomaly requires manual investigation, not an automatic correction.

## Testing: what's verified and how

`signing_key_service.py`'s functions all require a real DB session, and this environment has no local Postgres to run integration tests against (the same gap noted in AGENT_LIFECYCLE.md for the rest of `agent_service.py`, and true for every DB-touching service in this codebase, none of which have DB-integration tests today). Instead, the startup path was verified directly, twice, against the real running app (`fastapi.testclient.TestClient`, lifespan triggered via `with client:`):

1. **No signing key configured**: the hook logs `signing_key_not_configured` and skips cleanly, exactly as designed, without crashing app boot.
2. **A real key configured, database unreachable**: the hook's DB call raises `sqlalchemy.exc.OperationalError`, which is caught, logged in full via `logger.exception`, and does not propagate; app boot completes successfully. This confirms the deliberate "never let this block serving traffic" behavior actually holds under a real failure, not just in the code's stated intent.

All 136 existing backend unit tests still pass unchanged. What's not yet verified: an actual rotation (two different keys, both registered, old one retired, both still verifying their own historical records) against a real database. That requires the local Postgres this environment doesn't have, and should be exercised at least once against a real staging/production database before being fully trusted.

## What this doesn't fix

`Evidence`/`AgentAuditEvent`'s `key_id` column is still a plain `Text` field, not a foreign key into `signing_keys` (adding that constraint cleanly, with existing rows already satisfying it, is a reasonable fast-follow, not attempted in this pass to keep this change small and additive). This also doesn't address hash-chaining between consecutive Evidence records (a separate, larger gap tracked in SECURITY.md) or the underlying lack of real human authentication (also tracked separately): this change is scoped specifically to making key rotation safe, not a general evidentiary-integrity overhaul.
