"""Registers a new agent once. Run this the first time you set up an
integration; every later run just confirms the same identity is already
on file (register() is idempotent per private key, see SDK_REFERENCE.md).

    export PAYREALITY_API_KEY="your-operator-key"
    python examples/register_agent.py
"""

import os

from payreality import Agent

agent = Agent(api_key=os.environ["PAYREALITY_API_KEY"])

registered = agent.register(
    name="AP Automation Bot",
    principal="Finance Manager",
    owner="finance-eng@example.com",
    description="Approves routine vendor payments under policy limits.",
)

print(f"Registered agent_id={registered.agent_id}")
print(f"Certificate id={registered.certificate_id}")
print(f"Acting for principal: {registered.principal_name}")
print()
print("Private key generated and stored locally. It never left this machine.")
print("Reuse this same Agent (or construct one with the same private_key) for authorize() calls.")
