"""Two things this example shows:

1. A non-financial operation/resource pair (Release / Blast Zone), the
   same universal-vocabulary shape RESOURCE_MODEL.md and OPERATION_MODEL.md
   describe. `resource` still needs to normalize to a known action for
   the Decision Engine to enforce it today (see approve_invoice.py for
   what happens when it doesn't) - this SDK doesn't hide that, it's
   just accurately reflecting where the platform's vocabulary support
   actually is right now.
2. `decision.raise_for_outcome()`: an alternative to checking
   `decision.allowed` by hand, for callers who prefer exception-flow
   control, mirroring `requests.Response.raise_for_status()`.
"""

import os

from payreality import Agent, AuthorizationDenied, HumanReviewRequired

agent = Agent(api_key=os.environ["PAYREALITY_API_KEY"])
agent.register(name="Mine Operations Bot", principal="Operations Manager")

decision = agent.authorize(
    principal="Operations Manager",
    operation="Release",
    resource="Blast Zone",
    resource_data={
        "amount": 0,  # required by today's wire format even for non-financial actions
        "zone_id": "B-14",
        "clearance_confirmed": True,
    },
    metadata={"shift": "night", "supervisor": "J. Nkosi"},
)

try:
    decision.raise_for_outcome()
    print("Released.")
except AuthorizationDenied as e:
    print(f"Denied: {e}")
except HumanReviewRequired as e:
    print(f"Escalated for human review: {e} (decision_id={e.decision.decision_id})")
