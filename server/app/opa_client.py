"""httpx-based OPA client — implements the OpaClient protocol used by
app.domain.decision.engine, and the bundle-activation calls used by the
Policy Compiler (spec 12.4 Stage 9)."""

from typing import Any

import httpx

from app.config import settings
from app.domain.decision.engine import OPAEvaluationError, OPATimeoutError

DATA_PATH = "/v1/data/payreality/authorization"


class HttpOpaClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.opa_url

    def query(self, input_doc: dict[str, Any], timeout_ms: int = 200) -> dict[str, Any]:
        try:
            resp = httpx.post(
                f"{self.base_url}{DATA_PATH}",
                json={"input": input_doc},
                timeout=timeout_ms / 1000,
            )
        except httpx.TimeoutException as e:
            raise OPATimeoutError() from e
        except httpx.HTTPError as e:
            raise OPAEvaluationError(code="connection_error", message=str(e)) from e

        if resp.status_code != 200:
            raise OPAEvaluationError(code=f"http_{resp.status_code}")

        try:
            body = resp.json()
        except ValueError as e:
            raise OPAEvaluationError(code="bad_response") from e

        result = body.get("result")
        if result is None:
            # OPA returns no "result" key when the queried path is undefined.
            return {}
        return result

    def upload_data(self, path: str, data: Any) -> None:
        """PUT arbitrary data (e.g. compiled mandates/constraints) into
        OPA's in-memory data store at data.<path>."""
        resp = httpx.put(f"{self.base_url}/v1/data/{path}", json=data, timeout=5.0)
        resp.raise_for_status()

    def upload_policy(self, policy_path: str, rego_source: str) -> str:
        """PUT a Rego module, returns the revision OPA assigns."""
        resp = httpx.put(
            f"{self.base_url}/v1/policies/{policy_path}",
            content=rego_source.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
            timeout=5.0,
        )
        resp.raise_for_status()
        return resp.json().get("result", {}).get("revision", "")

    def health(self) -> bool:
        try:
            resp = httpx.get(f"{self.base_url}/health", timeout=2.0)
            return resp.status_code == 200
        except httpx.HTTPError:
            return False
