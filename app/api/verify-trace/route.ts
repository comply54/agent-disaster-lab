import { NextRequest, NextResponse } from "next/server"
import { verifyTraceRecord } from "@/lib/trace"
import { DEMO_PUBLIC_KEY } from "@/lib/receipt-demo"

const PUBLIC_KEY = process.env.COMPLY54_DEMO_PUBLIC_KEY ?? DEMO_PUBLIC_KEY

export async function POST(request: NextRequest) {
  let token: string
  try {
    const body = await request.json()
    token = body.token
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  try {
    const payload = await verifyTraceRecord(token, PUBLIC_KEY)
    return NextResponse.json({ payload })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 })
  }
}
