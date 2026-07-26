"""What happens when `resource` doesn't match one of PayReality's known
actions yet. This is deliberately not a "happy path" example: it shows
the platform's real, honest fallback behaviour, not a fabricated
success case.

As of this SDK version, PayReality's Decision Engine recognizes a fixed
vocabulary of actions (vendor_payment, purchase_order_create,
wire_transfer). "Invoice" isn't one of them, so this authorize() call
is expected to come back HUMAN_REVIEW: an unrecognized action never
silently defaults to ALLOW, it always escalates to a human instead
(fail-closed by design, see docs/API_SPECIFICATION.md).
"""

import os

from payreality import Agent

agent = Agent(api_key=os.environ["PAYREALITY_API_KEY"])
agent.register(name="AP Automation Bot", principal="Finance Manager")

decision = agent.authorize(
    principal="Finance Manager",
    operation="Approve",
    resource="Invoice",
    resource_data={"amount": 4200, "vendor": "Acme Supplies"},
)

print(f"Outcome: {decision.outcome}")
print(f"Reason: {decision.reason}")
assert decision.requires_human_review, "an unrecognized resource should escalate, never silently allow"
