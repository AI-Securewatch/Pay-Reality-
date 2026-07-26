# SDK Quickstart

## Install

```bash
pip install -e sdk-python/
```

(Not yet published to PyPI; this phase ships the package, not the release. See `SDK_ARCHITECTURE.md` for why.)

## 1. Register an agent, once

```python
from payreality import Agent

agent = Agent(api_key="your-operator-key")

registered = agent.register(
    name="AP Automation Bot",
    principal="Finance Manager",
)

print(registered.agent_id, registered.certificate_id)
```

This generates an ED25519 keypair, sends only the public key to PayReality, and stores the private key locally (`~/.payreality/credentials.json` by default, permissions restricted to your user; see `SDK_SECURITY.md`). You never see the key material and never construct a signature by hand.

Calling `register()` again later (even in a new process, as long as it's the same private key) is safe: it recognizes the identity already on file and returns it, without registering a second time.

## 2. Authorize an action

```python
decision = agent.authorize(
    principal="Finance Manager",
    operation="Approve",
    resource="Vendor Payment",
    resource_data={
        "amount": 85000,
        "vendor": "ABC Ltd",
    },
)
```

That's the entire call. No timestamp, no nonce, no signature, no headers: `authorize()` builds and signs the request itself.

## 3. Handle the outcome

```python
if decision.allowed:
    execute_payment()
elif decision.requires_human_review:
    print(f"Sent for review: {decision.decision_id}")
else:
    print(f"Denied: {decision.reason}")
    stop()
```

Every outcome (`ALLOW`, `DENY`, `HUMAN_REVIEW`) is a normal, expected return value, never an exception. If you'd rather use exception-flow control:

```python
from payreality import AuthorizationDenied, HumanReviewRequired

try:
    decision.raise_for_outcome()
    execute_payment()
except AuthorizationDenied as e:
    stop()
except HumanReviewRequired as e:
    print(f"Escalated: {e.decision.decision_id}")
```

## 4. If it comes back HUMAN_REVIEW

A human resolves it separately (Policy Studio's Review Queue, or the Runtime Decisions page). Poll for the outcome:

```python
import time

while True:
    latest = agent.get_decision(decision.decision_id)
    if not latest.pending:
        print(latest.outcome, latest.resolution)
        break
    time.sleep(2)
```

## Configuration

```python
agent = Agent(
    api_key="...",
    private_key="...",       # omit to have register() generate one
    base_url="https://api.aisecurewatch.com",  # the default; override for local/staging
    timeout=10.0,             # seconds per request attempt
    retry_count=3,            # network/5xx retries before giving up
)
```

Every parameter also has an environment-variable-friendly path: read `os.environ["PAYREALITY_API_KEY"]` yourself and pass it in, or set `PAYREALITY_HOME` to change where the local credential file lives (default `~/.payreality`).

## Full runnable examples

- `examples/register_agent.py`
- `examples/approve_payment.py`: the flow above, end to end
- `examples/approve_invoice.py`: what happens when a resource isn't in PayReality's known vocabulary yet (an honest, deliberately-not-happy-path example)
- `examples/custom_operation.py`: a non-financial operation/resource pair, plus the `raise_for_outcome()` style

See `SDK_REFERENCE.md` for every parameter and return value, and `SDK_SECURITY.md` for exactly what gets signed, how, and where keys live.
