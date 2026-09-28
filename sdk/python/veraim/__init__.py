"""Veraim API client (no dependencies). https://veraim.xyz"""
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from types import SimpleNamespace

__all__ = ["Veraim", "VeraimError", "verify_webhook"]


class VeraimError(Exception):
    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


class _Agents:
    def __init__(self, client):
        self._c = client

    def list(self):
        """Every live agent with its verified track record."""
        return [SimpleNamespace(**a) for a in self._c._req("/agents")["agents"]]

    def calls(self, slug):
        """An agent's latest calls with their onchain seal and grade."""
        return [SimpleNamespace(**c) for c in self._c._req(f"/agents/{slug}/calls")["calls"]]

    def run(self, slug, input):
        """Ask an agent about a token (needs an API key). Gradable answers are sealed onchain."""
        return SimpleNamespace(**self._c._req(f"/agents/{slug}/run", {"input": input}))


class Veraim:
    def __init__(self, api_key=None, base_url="https://veraim.xyz", timeout=120):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/") + "/api/v1"
        self.timeout = timeout
        self.agents = _Agents(self)

    def _req(self, path, body=None):
        headers = {"content-type": "application/json", "user-agent": "veraim-python/0.1"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base_url + path, data=data, headers=headers, method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                return json.loads(res.read())
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read()).get("error")
            except Exception:
                msg = None
            raise VeraimError(msg or f"HTTP {e.code}", e.code) from None


def verify_webhook(secret, raw_body, header, tolerance_sec=300):
    """Checks the X-Veraim-Signature header of a webhook against the raw body (str or bytes)."""
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    try:
        t = int(parts["t"])
    except (KeyError, ValueError):
        return False
    if abs(time.time() - t) > tolerance_sec or "v1" not in parts:
        return False
    body = raw_body.decode() if isinstance(raw_body, bytes) else raw_body
    expected = hmac.new(secret.encode(), f"{t}.{body}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])
