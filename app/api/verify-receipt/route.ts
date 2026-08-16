import { NextRequest, NextResponse } from "next/server"
import { verifyReceipt } from "@comply54/core"
import { DEMO_PUBLIC_KEY } from "@/lib/receipt-demo"

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
    const payload = await verifyReceipt(token, DEMO_PUBLIC_KEY)
    return NextResponse.json({ payload })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 })
  }
}
