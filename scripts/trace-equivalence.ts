/**
 * Proves the TypeScript TRACE mapping in lib/trace.ts produces the same claims
 * as the published Python adapter (agentrust-io/integrations).
 *
 * Run: npx tsx scripts/trace-equivalence.ts <out-dir>
 *
 * Emits the ComplianceResult in both camelCase (TS SDK shape) and snake_case
 * (Python SDK shape) plus the TS claim set, so the Python side can be run on
 * the same logical input and the two compared claim by claim.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { NigeriaInsuranceCompliance } from "@comply54/core"
import { buildTraceRecord } from "../lib/trace"
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY } from "../lib/receipt-demo"

const FIXED_IAT = 1760000000
const AGENT_ID = "claims-voice-agent"
const MODEL = "anthropic/claude-sonnet-4-6"

async function main() {
  const outDir = process.argv[2] ?? "."
  mkdirSync(outDir, { recursive: true })

  // The voice-commitment scenario: a ₦15M life claim approved with no senior
  // adjuster sign-off. Same inputs the demo sends to /api/enforce.
  const compliance = new NigeriaInsuranceCompliance()
  const result = compliance.check(
    "approve_claim",
    { claim_amount: 15_000_000, claim_id: "CLM-9920-WEM" },
    "",
    { senior_approval: false },
  )

  const { token, payload } = await buildTraceRecord(
    result,
    DEMO_PRIVATE_KEY,
    DEMO_PUBLIC_KEY,
    { agentId: AGENT_ID, model: MODEL, issuedAt: FIXED_IAT },
  )

  // Python SDK shape: snake_case keys, which is what the adapter reads.
  const pythonShape = {
    overall: result.overall,
    audit_id: result.auditId,
    decisions: result.decisions.map((d) => ({
      pack: d.pack,
      regulation: d.regulation,
      jurisdiction: d.jurisdiction,
      action: d.action,
      messages: d.messages,
    })),
  }

  writeFileSync(`${outDir}/result-python-shape.json`, JSON.stringify(pythonShape, null, 2))
  writeFileSync(`${outDir}/ts-claims.json`, JSON.stringify(payload, null, 2))
  writeFileSync(`${outDir}/ts-token.jwt`, token)

  console.log("overall:", result.overall)
  console.log("packs:", (payload.comply54 as any).packs_evaluated.join(", "))
  console.log("bundle_hash:", (payload.policy as any).bundle_hash)
  console.log("appraisal:", (payload.appraisal as any).status)
  console.log("wrote ts-claims.json, result-python-shape.json, ts-token.jwt")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
