/** Round-trip and tamper checks for the TRACE record path. */

import { NigeriaInsuranceCompliance } from "@comply54/core"
import { buildTraceRecord, verifyTraceRecord } from "../lib/trace"
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY } from "../lib/receipt-demo"

async function main() {
  const compliance = new NigeriaInsuranceCompliance()
  const result = compliance.check(
    "approve_claim",
    { claim_amount: 15_000_000, claim_id: "CLM-9920-WEM" },
    "",
    { senior_approval: false },
  )

  const { token } = await buildTraceRecord(result, DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, {
    agentId: "claims-voice-agent",
    model: "anthropic/claude-sonnet-4-6",
  })

  const payload = await verifyTraceRecord(token, DEMO_PUBLIC_KEY)
  console.log("round-trip verify: OK")
  console.log("  appraisal:", (payload.appraisal as any).status)

  // Flip a claim and confirm the signature no longer validates.
  const [h, p, s] = token.split(".")
  const decoded = JSON.parse(Buffer.from(p, "base64url").toString())
  decoded.appraisal.status = "affirming"
  const forged = `${h}.${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${s}`

  try {
    await verifyTraceRecord(forged, DEMO_PUBLIC_KEY)
    console.error("TAMPER NOT DETECTED - this is a bug")
    process.exit(1)
  } catch {
    console.log("tamper detection: OK (forged appraisal rejected)")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
