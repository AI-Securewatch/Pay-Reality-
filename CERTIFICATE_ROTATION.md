# Certificate Rotation

## Certificate lifecycle

```
Issued -> Active -> Rotated
             \-> Expired   (when its agent retires)
             \-> Revoked   (when its agent is revoked)
```

`Certificate` (`server/app/db/models.py`) has been a separate table, one-to-many with `Agent`, since Phase 1; this phase widens its `status` CHECK constraint from `active|rotated|revoked` to `issued|active|rotated|expired|revoked` and adds `activated_at`/`rotated_at`/`expires_at` timestamps alongside the existing `issued_at`/`revoked_at`.

**Only one active certificate is allowed**, and as of this phase that's enforced by the database itself, not just a code comment: `idx_certificates_single_active` is a partial unique index on `certificates(agent_id) WHERE status = 'active'` (the same pattern `Policy`'s `idx_policies_single_active` already used for "exactly one active Policy"). Before this migration, "exactly one Certificate is active per Agent" was only asserted in a comment in `agent_service.py`; a bug or race could in principle have created two. It can't now.

## The rotation flow

1. **Generate a new key pair, agent-side.** Never server-side: PayReality is specifically designed to never hold an agent's private key (see "Security" below).
2. **Upload the new public key.** `POST /agents/{id}/rotate {"new_public_key": "..."}`, operator-key gated (the same shared credential `register()` already uses, see SDK_ARCHITECTURE.md's honesty note on what `api_key` really is today).
3. **The new certificate activates immediately.** `agent_service.rotate_certificate()` (`server/app/services/agent_service.py`) creates the new `Certificate` row as `active` and `activated_at=now` in the same call, rather than a separate issue-then-activate step for rotation specifically. This mirrors `create_agent`'s own precedent ("Phase 1 has no separate certificate issuance step") for the same reason: no interactive CSR flow exists yet, just a caller-supplied public key.
4. **The old certificate becomes `rotated`**, never deleted, `rotated_at=now`.
5. **Future Intents use the new certificate.** `verify_agent_signature` resolves an Intent's signer by certificate ID; from this point, requests signed with the old key are rejected as `unknown_or_inactive_certificate`.
6. **Existing Evidence remains exactly as valid as before.** Verified directly from the schema, not assumed: `Intent`, `Decision`, and `Evidence` all reference `agent_id`, never `certificate_id`. Nothing about a past Evidence record's signature or validity changes when its agent's certificate rotates later.

An `agent_audit_events` row (`certificate_rotated`, with both the old and new certificate IDs) is written in the same transaction, so rotation is as auditable as every other lifecycle event (AGENT_LIFECYCLE.md).

## The honest limit on "Bulk: Rotate Certificates"

The spec asks for a bulk rotate-certificates operation alongside bulk suspend/activate/retire. Those three are straightforward: an operator action changes `Agent.status` for many agents at once. Rotation is different, and this difference is worth stating plainly rather than papering over: **rotating a certificate requires a new key pair, and PayReality never has an agent's private key to generate one from, by design.** An operator clicking "rotate" for 500 agents at once cannot make those 500 agents' own private keys appear on the server.

So `POST /agents/bulk/rotate` does the honest thing: it sets `Agent.rotation_requested_at` on each selected agent and logs a `certificate_rotation_requested` audit event, visible in the Agent Directory and to the agent's own next check-in. The actual cryptographic rotation still happens per-agent, agent-side, via `agent.rotate_keys()` in the SDK (SDK_AGENT_GUIDE.md) or a direct `POST /agents/{id}/rotate` call with a freshly generated public key. This is not a missing feature so much as a boundary the platform's own "no private keys are ever stored by PayReality" guarantee makes real: a bulk rotation that didn't work this way would either be fake (silently a no-op) or would require the platform to possess key material it is specifically designed never to hold.

## Security

Only public keys and certificates are ever transmitted to or stored by PayReality; this was already true before this phase (`CreateAgentRequest.public_key`, `Certificate.public_key`) and remains true for rotation (`RotateCertificateRequest.new_public_key`). Nothing in this phase introduces a private-key upload, export, or download path anywhere, client or server. See SDK_SECURITY.md for where a private key actually lives (locally, in the SDK's credential store) and SDK_AGENT_GUIDE.md for `agent.rotate_keys()`'s exact behavior, including that this SDK discards the old private key the moment rotation succeeds rather than keeping a history of retired keys around locally.
