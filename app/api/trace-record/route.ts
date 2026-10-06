import { NextRequest, NextResponse } from "next/server"
import { buildTraceRecord } from "@/lib/trace"
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY } from "@/lib/receipt-demo"
import type { ComplianceResult } from "@comply54/core"

const SIGNING_KEY = process.env.COMPLY54_DEMO_SIGNING_KEY ?? DEMO_PRIVATE_KEY
const PUBLIC_KEY = process.env.COMPLY54_DEMO_PUBLIC_KEY ?? DEMO_PUBLIC_KEY

export async function POST(request: NextRequest) {
  let body: { result?: ComplianceResult; agentId?: string; model?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.result || typeof body.result !== "object") {
    return NextResponse.json({ error: "result is required" }, { status: 400 })
  }

  try {
    const { token, payload } = await buildTraceRecord(
      body.result,
      SIGNING_KEY,
      PUBLIC_KEY,
      { agentId: body.agentId, model: body.model },
    )
    return NextResponse.json({ token, payload })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
