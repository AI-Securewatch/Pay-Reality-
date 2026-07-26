"""The only class most developers using this SDK will ever import.

    from payreality import Agent

    agent = Agent(api_key="...", private_key="...")
    decision = agent.authorize(
        principal="Finance Manager",
        operation="Approve",
        resource="Vendor Payment",
        resource_data={"amount": 85000, "vendor": "ABC Ltd"},
    )

Every piece of ED25519 signing, certificate management, and HTTP
plumbing this needs lives in the other modules in this package;
`Agent` is where they're wired together behind a small, stable surface.
"""

from __future__ import annotations

import json
from typing import Any

from . import auth, crypto
from .client import HttpClient
from .configuration import Configuration, CredentialStore
from .exceptions import ApiError, ConfigurationError
from .models import Decision, RegisteredAgent, Resolution


class Agent:
    def __init__(
        self,
        api_key: str | None = None,
        private_key: str | None = None,
        base_url: str = "https://api.aisecurewatch.com",
        timeout: float = 10.0,
        retry_count: int = 3,
        credentials_path=None,
    ):
        config_kwargs: dict[str, Any] = dict(
            api_key=api_key,
            private_key=private_key,
            base_url=base_url,
            timeout=timeout,
            retry_count=retry_count,
        )
        if credentials_path is not None:
            config_kwargs["credentials_path"] = credentials_path
        self._config = Configuration(**config_kwargs)
        self._client = HttpClient(self._config)
        self._store = CredentialStore(self._config.credentials_path)

        self._private_key: str | None = private_key
        self._identity: RegisteredAgent | None = None
        if self._private_key:
            self._load_identity_from_store()

    # -- identity -----------------------------------------------------

    def _load_identity_from_store(self) -> None:
        public_key = crypto.public_key_from_private(self._private_key)
        record = self._store.get(public_key)
        if record is not None:
            self._identity = RegisteredAgent(**record)

    @property
    def is_registered(self) -> bool:
        """True once this Agent has a server-recognized identity, either
        from a `register()` call this session or loaded from a private
        key that was registered previously."""
        return self._identity is not None

    def _resolve_principal_id(self, name: str) -> tuple[str, str]:
        principals = self._client.request("GET", "/v1/principals")
        for p in principals:
            if p["name"] == name:
                return p["id"], p["name"]
        created = self._client.request(
            "POST", "/v1/principals", json={"name": name}, operator_auth=True
        )
        return created["id"], created["name"]

    def register(
        self,
        name: str,
        principal: str,
        owner: str | None = None,
        description: str | None = None,
    ) -> RegisteredAgent:
        """Registers this agent's public key with PayReality. Generates
        a keypair automatically if this Agent wasn't constructed with an
        explicit `private_key`; either way, the private key never
        leaves this machine; only the public key is sent.

        Idempotent per key: calling this again with the same private
        key (e.g. on every process restart) returns the identity already
        on file instead of registering a second time.
        """
        if self._private_key is None:
            keypair = crypto.generate_keypair()
            self._private_key = keypair.private_key_b64
            public_key = keypair.public_key_b64
        else:
            public_key = crypto.public_key_from_private(self._private_key)

        existing = self._store.get(public_key)
        if existing is not None:
            self._identity = RegisteredAgent(**existing)
            return self._identity

        principal_id, principal_name = self._resolve_principal_id(principal)

        response = self._client.request(
            "POST",
            "/v1/agents",
            json={
                "name": name,
                "acting_for_principal_id": principal_id,
                "public_key": crypto.encode_public_key_for_wire(public_key),
                "owner": owner,
                "description": description,
            },
            operator_auth=True,
        )

        identity = RegisteredAgent(
            agent_id=response["id"],
            certificate_id=response["certificate_id"],
            principal_id=principal_id,
            principal_name=principal_name,
            name=name,
        )
        self._store.save(public_key, identity.__dict__)
        self._identity = identity
        return identity

    # -- authorization --------------------------------------------------

    def authorize(
        self,
        principal: str,
        operation: str,
        resource: str,
        resource_data: dict[str, Any],
        metadata: dict[str, Any] | None = None,
        correlation_id: str | None = None,
    ) -> Decision:
        """Authorizes one action, synchronously, in one call. Signs and
        sends the request itself; nothing about ED25519, headers, or
        timestamps is the caller's problem.

        `principal` is checked against the principal this agent was
        registered for (a local safety check, not sent to the server:
        PayReality already knows which principal a given certificate
        acts for from registration, see SDK_ARCHITECTURE.md) and raises
        `ConfigurationError` on a mismatch, catching a wrong-agent
        mistake before it ever reaches the network.

        `resource` becomes the Runtime Policy action this is evaluated
        against (normalized to lowercase/underscores: "Vendor Payment"
        -> "vendor_payment"). `resource_data["amount"]` is required;
        `currency` defaults to "USD" if not given; `vendor`/`counterparty`
        is optional; everything else in `resource_data`, plus `operation`
        and `metadata`, is recorded as context on the resulting Evidence
        record. `operation` is not yet a separate concept the Runtime
        Engine enforces (SDK_ARCHITECTURE.md); recording it here means
        it is preserved for later, not silently dropped.
        """
        if self._identity is None:
            raise ConfigurationError(
                "This Agent has no registered identity yet. Call agent.register(...) once, "
                "or construct Agent(private_key=...) with a private key that was already registered."
            )
        if principal != self._identity.principal_name:
            raise ConfigurationError(
                f"This agent was registered for principal '{self._identity.principal_name}', "
                f"not '{principal}'. Register a separate Agent for each principal."
            )
        if "amount" not in resource_data:
            raise ConfigurationError("resource_data must include 'amount'.")

        action = resource.strip().lower().replace(" ", "_")
        amount = resource_data["amount"]
        currency = resource_data.get("currency", "USD")
        counterparty = resource_data.get("counterparty") or resource_data.get("vendor")

        context = {
            k: v for k, v in resource_data.items() if k not in ("amount", "currency", "counterparty", "vendor")
        }
        context["operation"] = operation
        if metadata:
            context["metadata"] = metadata

        body = {
            "agent_id": self._identity.agent_id,
            "action": action,
            "amount": amount,
            "currency": currency,
            "counterparty": counterparty,
            "context": context,
            "requested_at": auth.utc_now_iso(),
            "nonce": auth.new_nonce(),
            "correlation_id": correlation_id,
        }
        body_bytes = json.dumps(body).encode("utf-8")
        headers = auth.signed_headers(body_bytes, self._identity.certificate_id, self._private_key)

        response = self._client.request("POST", "/v1/intents", signed_body=body_bytes, headers=headers)
        decision = response["decision"]
        return Decision(
            outcome=decision["outcome"],
            decision_id=decision["decision_id"],
            evidence_id=response.get("evidence_id"),
            reason=decision.get("reason"),
            explanation=decision.get("reason"),
            status=response["status"],
            evaluated_mandates=tuple(decision.get("evaluated_mandates", [])),
        )

    def get_decision(self, decision_id: str) -> Decision:
        """Fetches the current state of a decision: useful for polling
        one that came back HUMAN_REVIEW until a human resolves it."""
        response = self._client.request("GET", f"/v1/decisions/{decision_id}")
        resolution = None
        if response.get("resolution"):
            resolution = Resolution(
                resolution=response["resolution"]["resolution"],
                resolved_by=response["resolution"]["resolved_by"],
                reason=response["resolution"].get("reason"),
            )
        return Decision(
            outcome=response["outcome"],
            decision_id=response["id"],
            evidence_id=None,
            reason=response.get("reason"),
            explanation=response.get("reason"),
            status=response["status"],
            evaluated_mandates=tuple(response.get("evaluated_mandates", [])),
            resolution=resolution,
        )

    # -- diagnostics ------------------------------------------------------

    def health(self) -> dict[str, Any]:
        """A thin wrapper over GET /health, useful for a startup check
        that the configured base_url is actually reachable."""
        try:
            return self._client.request("GET", "/health")
        except ApiError:
            raise

    def version(self) -> dict[str, Any]:
        """A thin wrapper over GET /version."""
        return self._client.request("GET", "/version")
