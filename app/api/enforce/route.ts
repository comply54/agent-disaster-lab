import { NextRequest, NextResponse } from "next/server"
import type { EnforcementRequest, EnforcementResult } from "@/lib/types"
import { DEMO_PRIVATE_KEY } from "@/lib/receipt-demo"

import {
  NigeriaFintechCompliance,
  NigeriaHealthcareCompliance,
  NigeriaInsuranceCompliance,
  KenyaFintechCompliance,
  PanAfricanFintechCompliance,
} from "@comply54/core"

type SectorClassName =
  | "NigeriaFintechCompliance"
  | "NigeriaHealthcareCompliance"
  | "NigeriaInsuranceCompliance"
  | "KenyaFintechCompliance"
  | "PanAfricanFintechCompliance"

// Use env var in production deployments; fall back to the committed demo key.
const SIGNING_KEY = process.env.COMPLY54_DEMO_SIGNING_KEY ?? DEMO_PRIVATE_KEY

function getSectorInstance(className: SectorClassName) {
  const opts = { signingKey: SIGNING_KEY }
  switch (className) {
    case "NigeriaHealthcareCompliance":
      return new NigeriaHealthcareCompliance(opts)
    case "NigeriaInsuranceCompliance":
      return new NigeriaInsuranceCompliance(opts)
    case "KenyaFintechCompliance":
      return new KenyaFintechCompliance(opts)
    case "PanAfricanFintechCompliance":
      return new PanAfricanFintechCompliance(opts)
    default:
      return new NigeriaFintechCompliance(opts)
  }
}

export async function POST(request: NextRequest) {
  let body: EnforcementRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { toolName, params, sectorClass, action, output, context } = body

  if (!toolName || !sectorClass || !action) {
    return NextResponse.json(
      { error: "toolName, sectorClass, and action are required" },
      { status: 400 }
    )
  }

  try {
    const compliance = getSectorInstance(sectorClass as SectorClassName)
    const result = await compliance.checkSigned(
      action,
      params ?? {},
      output ?? "",
      context ?? {}
    )

    const response: EnforcementResult = {
      decision: result.overall,
      blocked: result.blocked,
      auditId: result.auditId,
      evaluatedAt: result.evaluatedAt,
      receiptToken: result.receiptToken,
      ...(result.primaryViolation && {
        primaryViolation: {
          pack: result.primaryViolation.pack,
          regulation: result.primaryViolation.regulation,
          jurisdiction: result.primaryViolation.jurisdiction,
          decision: result.primaryViolation.action as "deny" | "escalate" | "audit",
          messages: result.primaryViolation.messages,
          citations: result.primaryViolation.citations,
          ruleTriggered: result.primaryViolation.ruleTriggered,
        },
      }),
      ...(result.violations.length > 0 && {
        allViolations: result.violations.map((v) => ({
          pack: v.pack,
          regulation: v.regulation,
          jurisdiction: v.jurisdiction,
          decision: v.action as "deny" | "escalate" | "audit",
          messages: v.messages,
          citations: v.citations,
          ruleTriggered: v.ruleTriggered,
        })),
      }),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("[/api/enforce] Error:", err)
    return NextResponse.json(
      { error: "Enforcement evaluation failed", details: String(err) },
      { status: 500 }
    )
  }
}
