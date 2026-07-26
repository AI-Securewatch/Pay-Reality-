"""A real, ephemeral OPA server for integration tests in this directory.

Skips (rather than fails) when no `opa` binary can be found, so CI
environments without OPA installed get an honest "skipped: opa binary not
found," never a false pass from a mocked-out check pretending to be a
real one. Locate an OPA binary via PATH first (the portable path, and
what CI should use once server/.github workflow installs one), falling
back to the known WinGet install location on this Windows dev machine.
"""

import shutil
import socket
import subprocess
import time

import httpx
import pytest

_WINDOWS_WINGET_OPA_FALLBACK = (
    r"C:\Users\user\AppData\Local\Microsoft\WinGet\Packages"
    r"\open-policy-agent.opa_Microsoft.Winget.Source_8wekyb3d8bbwe\opa.exe"
)


def _find_opa_binary() -> str | None:
    found = shutil.which("opa")
    if found:
        return found
    import os

    if os.path.exists(_WINDOWS_WINGET_OPA_FALLBACK):
        return _WINDOWS_WINGET_OPA_FALLBACK
    return None


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def opa_url():
    opa_binary = _find_opa_binary()
    if opa_binary is None:
        pytest.skip("opa binary not found on PATH or at the known local fallback location")

    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"
    proc = subprocess.Popen(
        [opa_binary, "run", "--server", "--addr", f"127.0.0.1:{port}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            try:
                resp = httpx.get(f"{base_url}/health", timeout=1)
                if resp.status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(0.2)
        else:
            proc.terminate()
            pytest.skip("opa server did not become healthy in time")

        yield base_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
