/**
 * comply54 ComplianceResult -> TRACE v0.2 claim.
 *
 * A faithful port of the published comply54 TRACE adapter
 * (agentrust-io/integrations: integrations/comply54/src/comply54_to_trace.py).
 * Both emit the same claim set from the same ComplianceResult so a record minted
 * here verifies identically to one minted by the Python CLI.
 *
 * Conforms to TRACE at Level 0: software-only, no hardware TEE attestation, so
 * the measurement and digest fields carry the canonical all-zero placeholders.
 */

import type { ComplianceResult } from "@comply54/core"

const EAT_PROFILE = "tag:agentrust-io.com,2026:trace-v0.2"
const COMPLY54_REPO = "https://github.com/comply54/comply54"
const POLICY_VERSION = "0.1.0"

const APPRAISAL_MAP: Record<string, string> = {
  allow: "affirming",
  audit: "warning",
  escalate: "warning",
  deny: "contraindicated",
}

/**
 * Python's json.dumps separators, not JavaScript's.
 *
 * The adapter derives bundle_hash from `json.dumps(pack_ids, sort_keys=True)`,
 * which emits `["a", "b"]`. JSON.stringify emits `["a","b"]`. The two hash to
 * different values, so matching Python's spacing here is what keeps the TS and
 * Python records byte-identical.
 */
function pythonJsonDumpsStringList(items: string[]): string {
  return "[" + items.map((s) => JSON.stringify(s)).join(", ") + "]"
}

function base64url(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function pemBodyToBytes(pem: string): Uint8Array {
  const b64 = pem.replace(/-----(BEGIN|END)[^-]+-----/g, "").replace(/\s+/g, "")
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Ed25519 SPKI is a 12-byte header followed by the 32-byte raw key. */
function rawPublicKeyFromSpki(publicKeyPem: string): Uint8Array {
  return pemBodyToBytes(publicKeyPem).slice(-32)
}

export interface TraceOptions {
  agentId?: string
  /** "provider/model-id"; the adapter's CLI default is "unknown/unknown". */
  model?: string
  /** Fixes `iat` for deterministic comparison against the Python adapter. */
  issuedAt?: number
}

export function buildTracePayload(
  result: ComplianceResult,
  publicKeyPem: string,
  opts: TraceOptions = {},
): Record<string, unknown> {
  const agentId = opts.agentId ?? "fintech-agent"
  const model = opts.model ?? "unknown/unknown"

  const decisions = result.decisions ?? []
  const packIds = Array.from(
    new Set(decisions.map((d) => d.pack).filter(Boolean)),
  ).sort()
  const jurisdictions = Array.from(
    new Set(decisions.map((d) => d.jurisdiction).filter(Boolean)),
  ).sort()

  const violations = decisions
    .filter((d) => d.action !== "allow")
    .map((d) => ({
      pack: d.pack,
      regulation: d.regulation,
      action: d.action,
      messages: (d.messages ?? []).slice(0, 1),
    }))

  const sep = model.indexOf("/")
  const provider = sep === -1 ? "" : model.slice(0, sep)
  const modelId = sep === -1 ? "" : model.slice(sep + 1)

  return {
    eat_profile: EAT_PROFILE,
    iat: opts.issuedAt ?? Math.floor(Date.now() / 1000),
    subject: `spiffe://comply54.io/agent/${agentId}`,

    cnf: {
      jwk: {
        kty: "OKP",
        crv: "Ed25519",
        x: base64url(rawPublicKeyFromSpki(publicKeyPem)),
      },
    },

    model: {
      provider: provider || "unknown",
      model_id: modelId || model,
      version: "unknown",
      weights_digest: "sha256:" + "0".repeat(64),
    },

    runtime: {
      platform: "software-only",
      measurement: "sha384:" + "0".repeat(96),
      rim_uri: COMPLY54_REPO,
    },

    policy: {
      bundle_hash: "", // filled by buildTraceRecord, which can await the digest
      enforcement_mode: "enforce",
      version: POLICY_VERSION,
    },

    data_class: "confidential",

    build_provenance: {
      slsa_level: 0,
      builder: COMPLY54_REPO,
      digest: "sha256:" + "0".repeat(64),
    },

    appraisal: {
      status: APPRAISAL_MAP[result.overall] ?? "contraindicated",
      verifier: COMPLY54_REPO,
      policy_ref: `comply54-v${POLICY_VERSION}/${packIds.join(",")}`,
    },

    transparency: "",

    comply54: {
      audit_id: result.auditId ?? "unknown",
      overall: result.overall ?? "deny",
      jurisdictions,
      packs_evaluated: packIds,
      violations,
    },
  }
}

/** Deterministic fingerprint of the pack IDs that ran. */
export async function bundleHash(packIds: string[]): Promise<string> {
  const sorted = Array.from(new Set(packIds)).sort()
  return "sha256:" + (await sha256Hex(pythonJsonDumpsStringList(sorted)))
}

async function signEdDSA(
  signingInput: string,
  privateKeyPem: string,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBodyToBytes(privateKeyPem) as unknown as BufferSource,
    { name: "Ed25519" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign(
    "Ed25519",
    key,
    new TextEncoder().encode(signingInput) as unknown as BufferSource,
  )
  return new Uint8Array(sig)
}

/** Build and sign a TRACE v0.2 record. Returns the compact JWT and its payload. */
export async function buildTraceRecord(
  result: ComplianceResult,
  privateKeyPem: string,
  publicKeyPem: string,
  opts: TraceOptions = {},
): Promise<{ token: string; payload: Record<string, unknown> }> {
  const payload = buildTracePayload(result, publicKeyPem, opts)

  const packIds = (payload.comply54 as { packs_evaluated: string[] }).packs_evaluated
  ;(payload.policy as { bundle_hash: string }).bundle_hash = await bundleHash(packIds)

  const header = { alg: "EdDSA", typ: "JWT" }
  const enc = (o: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(o)))

  const signingInput = `${enc(header)}.${enc(payload)}`
  const sig = await signEdDSA(signingInput, privateKeyPem)

  return { token: `${signingInput}.${base64url(sig)}`, payload }
}

export class InvalidTraceRecordError extends Error {}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/**
 * Verify a TRACE record's Ed25519 signature and return its claims.
 *
 * Checks the signature only. On this demo the signing key is public, so anyone
 * can alter a claim and sign it again: a successful check establishes neither
 * provenance nor integrity, only that the verification path works. Supply a key
 * the verifier actually trusts before reading anything more into a pass.
 */
export async function verifyTraceRecord(
  token: string,
  publicKeyPem: string,
): Promise<Record<string, unknown>> {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new InvalidTraceRecordError("malformed JWT: expected 3 segments")
  }
  const [h, p, s] = parts

  let header: { alg?: string }
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlToBytes(h)))
  } catch {
    throw new InvalidTraceRecordError("malformed JWT header")
  }
  if (header.alg !== "EdDSA") {
    throw new InvalidTraceRecordError(`unsupported alg: ${header.alg}`)
  }

  const key = await crypto.subtle.importKey(
    "spki",
    pemBodyToBytes(publicKeyPem) as unknown as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"],
  )
  const ok = await crypto.subtle.verify(
    "Ed25519",
    key,
    base64urlToBytes(s) as unknown as BufferSource,
    new TextEncoder().encode(`${h}.${p}`) as unknown as BufferSource,
  )
  if (!ok) throw new InvalidTraceRecordError("signature verification failed")

  return JSON.parse(new TextDecoder().decode(base64urlToBytes(p)))
}
