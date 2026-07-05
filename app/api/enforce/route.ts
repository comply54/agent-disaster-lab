import { NextRequest, NextResponse } from "next/server"
import type { EnforcementRequest, EnforcementResult } from "@/lib/types"

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

function getSectorInstance(className: SectorClassName) {
  switch (className) {
    case "NigeriaHealthcareCompliance":
      return new NigeriaHealthcareCompliance()
    case "NigeriaInsuranceCompliance":
      return new NigeriaInsuranceCompliance()
    case "KenyaFintechCompliance":
      return new KenyaFintechCompliance()
    case "PanAfricanFintechCompliance":
      return new PanAfricanFintechCompliance()
    default:
      return new NigeriaFintechCompliance()
  }
}

export async function POST(request: NextRequest) {
  let body: EnforcementRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { toolName, params, sectorClass, action, context } = body

  if (!toolName || !sectorClass || !action) {
    return NextResponse.json(
      { error: "toolName, sectorClass, and action are required" },
      { status: 400 }
    )
  }

  try {
    const compliance = getSectorInstance(sectorClass as SectorClassName)
    const result = compliance.check(action, params ?? {}, "", context ?? {})

    const response: EnforcementResult = {
      decision: result.overall,
      blocked: result.blocked,
      auditId: result.auditId,
      evaluatedAt: result.evaluatedAt,
      ...(result.primaryViolation && {
        primaryViolation: {
          pack: result.primaryViolation.pack,
          regulation: result.primaryViolation.regulation,
          jurisdiction: result.primaryViolation.jurisdiction,
          messages: result.primaryViolation.messages,
          citations: result.primaryViolation.citations,
          ruleTriggered: result.primaryViolation.ruleTriggered,
        },
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
