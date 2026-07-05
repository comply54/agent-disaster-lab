import { ImageResponse } from "next/og"

export const alt = "Agent Disaster Lab — watch AI agents cause regulatory disasters"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 99,
            padding: "6px 18px",
            width: "fit-content",
            marginBottom: 48,
          }}
        >
          <div
            style={{ width: 8, height: 8, borderRadius: 99, background: "#ef4444" }}
          />
          <span style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>
            Live enforcement demos — real comply54 policies
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}>
          <div style={{ color: "white", fontSize: 66, fontWeight: 800, lineHeight: 1.1 }}>
            Watch AI Agents
          </div>
          <div style={{ color: "#ef4444", fontSize: 66, fontWeight: 800, lineHeight: 1.1 }}>
            cause regulatory disasters
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            — then comply54 stops them
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 48,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", gap: 28, color: "rgba(255,255,255,0.35)", fontSize: 16 }}>
            <span>9 real-world failure scenarios</span>
            <span>·</span>
            <span>CBN  NDPA  NHA  NAICOM  NFIU  KDPA</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 16, fontWeight: 600 }}>
            disaster.comply54.io
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
