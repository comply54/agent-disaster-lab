#!/usr/bin/env python3
"""
Enforce that lib/trace.ts stays equivalent to the published comply54 TRACE adapter.

Fetches the adapter from agentrust-io/integrations (the published artifact, not a
vendored copy), runs it over the same ComplianceResult the TypeScript side used,
and compares the two claim sets. Exits non-zero on any divergence, so an upstream
adapter change or a drifting port fails the build instead of being discovered
after publication.

Inputs (produced by scripts/trace-equivalence.ts):
    <artifacts>/ts-claims.json            claims minted by lib/trace.ts
    <artifacts>/result-python-shape.json  the same ComplianceResult, snake_case
    <artifacts>/ts-token.jwt              the TS-signed JWT

Usage:
    python3 scripts/trace_equivalence_check.py <artifacts-dir>

Env:
    TRACE_ADAPTER_REF   git ref of the adapter to check against (default: main)
    TRACE_ADAPTER_PATH  local adapter file; skips the network fetch
"""

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ADAPTER_URL = (
    "https://raw.githubusercontent.com/agentrust-io/integrations/"
    "{ref}/integrations/comply54/src/comply54_to_trace.py"
)

# Shared Ed25519 key so the `cnf` confirmation claim is comparable. Public demo
# key from lib/receipt-demo.ts; it protects nothing.
DEMO_KEY = (
    "-----BEGIN PRIVATE KEY-----\n"
    "MC4CAQAwBQYDK2VwBCIEIG8fqd9zBh+bHmHo+xTMPF87tIFFA0ee2kXSH05w20gg\n"
    "-----END PRIVATE KEY-----\n"
)

AGENT_ID = "claims-voice-agent"
MODEL = "anthropic/claude-sonnet-4-6"

# Wall-clock only. Every other claim must match exactly.
IGNORED_CLAIMS = {"iat"}


def fetch_adapter(dest: Path) -> str:
    local = os.environ.get("TRACE_ADAPTER_PATH")
    if local:
        dest.write_text(Path(local).read_text())
        return f"local:{local}"

    ref = os.environ.get("TRACE_ADAPTER_REF", "main")
    url = ADAPTER_URL.format(ref=ref)
    with urllib.request.urlopen(url, timeout=30) as resp:
        if resp.status != 200:
            raise SystemExit(f"could not fetch adapter: HTTP {resp.status} {url}")
        dest.write_bytes(resp.read())
    return url


def run_adapter(adapter: Path, result_json: Path, out: Path) -> dict:
    env = {**os.environ, "TRACE_PRIVATE_KEY_PEM": DEMO_KEY}
    proc = subprocess.run(
        [
            sys.executable, str(adapter), str(result_json),
            "--agent-id", AGENT_ID,
            "--model", MODEL,
            "--out", str(out),
        ],
        capture_output=True, text=True, env=env,
    )
    if proc.returncode != 0:
        raise SystemExit(f"adapter failed:\n{proc.stderr}")

    import jwt  # provided by the adapter's own dependency set

    return jwt.decode(out.read_text().strip(), options={"verify_signature": False})


def verify_ts_signature(token: str) -> None:
    """The TS-minted record must verify under an independent JWT implementation."""
    import jwt
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    key = serialization.load_pem_private_key(DEMO_KEY.encode(), password=None)
    assert isinstance(key, Ed25519PrivateKey)
    jwt.decode(token, key.public_key(), algorithms=["EdDSA"])


def main() -> None:
    artifacts = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    ts_claims = json.loads((artifacts / "ts-claims.json").read_text())
    result_json = artifacts / "result-python-shape.json"
    ts_token = (artifacts / "ts-token.jwt").read_text().strip()

    adapter = artifacts / "comply54_to_trace.py"
    source = fetch_adapter(adapter)
    print(f"adapter source: {source}")

    py_claims = run_adapter(adapter, result_json, artifacts / "py-token.jwt")

    verify_ts_signature(ts_token)
    print("TS-minted token verifies under PyJWT: OK")

    keys = sorted((set(ts_claims) | set(py_claims)) - IGNORED_CLAIMS)
    mismatches = []
    for k in keys:
        a = ts_claims.get(k, "<<absent in TS>>")
        b = py_claims.get(k, "<<absent in adapter>>")
        if a == b:
            print(f"  MATCH  {k}")
        else:
            mismatches.append(k)
            print(f"  DIFFER {k}")
            print(f"      ts:      {json.dumps(a)[:200]}")
            print(f"      adapter: {json.dumps(b)[:200]}")

    print(f"\ncompared {len(keys)} claims (ignored: {', '.join(sorted(IGNORED_CLAIMS))})")
    if mismatches:
        raise SystemExit(f"FAIL: {len(mismatches)} divergent claim(s): {', '.join(mismatches)}")
    print("PASS: lib/trace.ts is equivalent to the published comply54 TRACE adapter")


if __name__ == "__main__":
    main()
