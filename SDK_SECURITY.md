# SDK Security

## What actually gets signed

`auth.py::signed_headers()` signs the exact raw JSON body bytes that get sent on the wire, produced by `json.dumps()` on the `SubmitIntentRequest` payload, before any HTTP transport step touches them. This matters because the server (`server/app/domain/auth/signature.py::verify_request_signature`) verifies the signature against the raw bytes it received, not a re-serialized copy of them; signing anything else (a dict, a re-encoded string) risks a mismatch if key ordering or whitespace differs even slightly. `crypto.py::sign()` produces a base64-encoded ED25519 signature over those bytes using PyNaCl (`nacl.signing.SigningKey.sign`), the same library the server uses to verify (`nacl.signing.VerifyKey.verify`), so a signature this SDK produces is guaranteed compatible, not just probably compatible.

Two headers carry the result: `X-PayReality-Key-Id` (the registered `certificate_id`) and `X-PayReality-Signature` (the base64 signature). A timestamp and nonce (`auth.py::new_nonce()`, `utc_now_iso()`) go into the request body itself, not just the headers, because the server's replay check (`check_timestamp_window` plus a `UNIQUE(agent_id, nonce)` database constraint) validates them from there.

## Where the private key lives

`configuration.py::CredentialStore` persists it in a JSON file, one entry per public key, at `~/.payreality/credentials.json` by default. Two ways to change that: pass `credentials_path` to `Agent(...)`, or set the `PAYREALITY_HOME` environment variable to move the whole directory. On write, the SDK attempts `os.chmod(path, 0o600)` (owner read/write only) as a best-effort hardening step; this is not enforced or verified afterward, and it has no effect at all on Windows, where file permissions don't work the same way. Treat this file exactly like an SSH private key: it should never be committed to version control, and a `.gitignore` entry for `.payreality/` (or wherever `PAYREALITY_HOME` points) is worth adding to any project that uses this SDK.

There is no remote key backup, escrow, or recovery path. If `credentials.json` is lost, the agent's registered identity is unrecoverable; the fix is to register a new agent (a new keypair, a new `agent_id`) rather than trying to restore the old one.

## What `api_key` really is, stated plainly

`Agent(api_key=...)` is, today, the same shared operator credential (`X-PayReality-Operator-Key`) used everywhere else in this platform for administrative actions, not a distinct per-developer or per-agent API key. It is only needed for `register()` (creating a new Agent or Principal is an administrative action); `authorize()` never uses it, since a signed Intent authenticates purely through the agent's own ED25519 signature. This means:

- Handing a developer an `api_key` today is handing them the same level of administrative access every other integration on this platform currently shares, not a scoped-down credential.
- Compromise of that single key is not isolated to one agent or one developer; it affects every registration action across the platform.
- A real per-developer API key system (scoped to "can register agents for principal X only," individually revocable) does not exist yet. This SDK cannot manufacture that guarantee on top of an API that doesn't have it; anything claiming otherwise would be the same kind of overclaim already flagged and corrected earlier in this platform's history (the `ANTHROPIC_API_KEY` finding, the "so there is no integration?" conversation). Treat `api_key` as a production secret with the same care as any other administrative credential, and expect it to be replaced by scoped, per-developer credentials in a future phase, not this one.

## Replay protection

Every signed request includes a UTC timestamp and a random nonce. The server rejects a request whose timestamp falls outside its configured window, and separately rejects any `(agent_id, nonce)` pair it has already seen, via a database uniqueness constraint rather than a cache with its own expiry. A captured, valid signed request cannot be replayed once it falls outside that window, and cannot be replayed a second time within it either.

## Practical recommendations

- Do not commit `~/.payreality/credentials.json` or any copy of it. Do not commit `api_key` values; load them from an environment variable or a secrets manager, exactly as you would for a Stripe or OpenAI key.
- One registered agent (one keypair) per real-world automation, not one shared across several. Revoking or rotating one agent's access should not require touching any other agent's key.
- If `PAYREALITY_HOME` is set to a shared or networked location, verify its access permissions independently; this SDK's own `chmod` best-effort is not a substitute for that.
- Rotate `api_key` on the same schedule you'd rotate any other shared administrative credential, and treat any suspected leak of it as a platform-wide incident, not an isolated one, until a scoped-credential system exists to change that.
