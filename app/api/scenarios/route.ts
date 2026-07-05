import { NextResponse } from "next/server"
import { scenarios } from "@/lib/scenarios"

export async function GET() {
  const summary = scenarios.map(({ id, name, sector, regulation, authority, teaser, comply54SectorClass, regulationSpotlight }) => ({
    id,
    name,
    sector,
    regulation,
    authority,
    teaser,
    comply54SectorClass,
    severity: regulationSpotlight.severity,
  }))

  return NextResponse.json(summary)
}
