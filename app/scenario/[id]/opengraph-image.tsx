import { ImageResponse } from "next/og"
import { getScenario } from "@/lib/scenarios"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const SECTOR_COLORS: Record<string, string> = {
  Fintech: "#60a5fa",
  Healthcare: "#34d399",
  Insurance: "#a78bfa",
  Identity: "#fbbf24",
  Data: "#f87171",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ScenarioOgImage({ params }: Props) {
  const { id } = await params
  const scenario = getScenario(id)

  const name = scenario?.name ?? "Scenario"
  const sector = scenario?.sector ?? ""
  const teaser = scenario?.teaser ?? ""
  const regulation = scenario?.regulation ?? ""
  const authority = scenario?.authority ?? ""
  const sectorColor = SECTOR_COLORS[sector] ?? "#60a5fa"

  return new ImageResponse(
    (
      <div
        style={{
          background: "#080a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 44 }}>
          <span style={{ color: "#ef4444", fontSize: 18, fontWeight: 700 }}>
            AGENT DISASTER LAB
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>·</span>
          <span
            style={{
              color: sectorColor,
              fontSize: 15,
              fontWeight: 600,
              background: `${sectorColor}22`,
              border: `1px solid ${sectorColor}40`,
              borderRadius: 6,
              padding: "4px 14px",
            }}
          >
            {sector}
          </span>
        </div>

        {/* Scenario name */}
        <div
          style={{
            color: "white",
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          {name}
        </div>

        {/* Teaser */}
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 22,
            lineHeight: 1.5,
            maxWidth: 820,
            flexGrow: 1,
          }}
        >
          {teaser}
        </div>

        {/* Two-pane preview strip */}
        <div style={{ display: "flex", gap: 16, marginBottom: 36 }}>
          <div
            style={{
              flex: 1,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12,
              padding: "16px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ color: "#f87171", fontSize: 14, fontWeight: 700 }}>
              WITHOUT COMPLY54
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Agent runs freely — disaster unfolds
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 12,
              padding: "16px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ color: "#4ade80", fontSize: 14, fontWeight: 700 }}>
              PROTECTED BY COMPLY54
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Tool call intercepted — violation cited
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 22,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            {regulation}  ·  {authority}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            disaster.comply54.io
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
