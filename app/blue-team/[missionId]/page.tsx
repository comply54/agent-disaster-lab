"use client"

import { use, useState, useEffect, useCallback } from "react"
import { Shield, Loader2, ChevronRight, Copy, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { ALL_MISSIONS, type Mission } from "@/lib/missions"
import { getAttackerAgent } from "@/lib/attacker-agents"
import { loadBlueTeamRecord, type BlueTeamRecord } from "@/lib/blue-team-store"
import type { EnforcementResult, EnforcementViolation } from "@/lib/types"

// ── Decision badge ─────────────────────────────────────────────────────────────

function DecisionBadge({ decision, blocked }: { decision: string; blocked: boolean }) {
  if (blocked || decision === "deny") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-red-500/10 border border-red-500/25 text-red-400">
        BLOCKED
      </span>
    )
  }
  if (decision === "escalate") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 border border-amber-500/25 text-amber-400">
        ESCALATED
      </span>
    )
  }
  if (decision === "audit") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-blue-500/10 border border-blue-500/25 text-blue-400">
        AUDITED
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
      ALLOWED
    </span>
  )
}

// ── Violation card ─────────────────────────────────────────────────────────────

function ViolationCard({ v, index }: { v: EnforcementViolation; index: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-white/20 shrink-0">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-sm font-semibold text-white/80 truncate">{v.regulation}</span>
        </div>
        <DecisionBadge decision={v.decision} blocked={v.decision === "deny"} />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40 font-mono">
          {v.pack}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35">
          {v.jurisdiction}
        </span>
        {v.ruleTriggered && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/5 border border-red-500/15 text-red-400/60 font-mono">
            {v.ruleTriggered}
          </span>
        )}
      </div>

      {v.messages.length > 0 && (
        <ul className="space-y-1">
          {v.messages.map((msg, i) => (
            <li key={i} className="text-xs text-white/45 leading-relaxed flex gap-2">
              <span className="text-red-400/50 shrink-0 mt-0.5">›</span>
              {msg}
            </li>
          ))}
        </ul>
      )}

      {v.citations.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-1">
          {v.citations.map((c, i) => (
            <p key={i} className="text-[10px] text-white/25 font-mono leading-relaxed">
              {c.document} · {c.section} · {c.authority} ({c.year})
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Params table ───────────────────────────────────────────────────────────────

function ParamsTable({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params)
  if (entries.length === 0) return <p className="text-xs text-white/25 italic">No parameters recorded.</p>
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      {entries.map(([key, val], i) => (
        <div
          key={key}
          className={`flex items-start gap-4 px-4 py-2.5 ${
            i < entries.length - 1 ? "border-b border-white/5" : ""
          }`}
        >
          <span className="text-[11px] font-mono text-white/35 shrink-0 w-36 truncate">{key}</span>
          <span className="text-[11px] font-mono text-white/65 break-all">
            {typeof val === "object" ? JSON.stringify(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Share card ─────────────────────────────────────────────────────────────────

function ShareSection({ mission, record }: { mission: Mission; record: BlueTeamRecord }) {
  const [copied, setCopied] = useState(false)

  const shareText = [
    `🛡 Blue Team Report — ${mission.title}`,
    ``,
    `comply54 intercepted a "${record.toolName}" tool call in ${record.attackTurns} turns.`,
    `Pack triggered: ${record.violations[0]?.pack ?? "unknown"}`,
    `Decision: BLOCKED`,
    ``,
    `Regulation: ${record.violations[0]?.regulation ?? ""}`,
    ``,
    `Built on comply54 — open-source AI governance for African regulations.`,
    `https://comply54.io`,
  ].join("\n")

  const tweetText = encodeURIComponent(
    `🛡 comply54 blocked "${record.toolName}" in ${record.attackTurns} turns — ${mission.title}\n\nPack: ${record.violations[0]?.pack ?? "?"} · Decision: BLOCKED\n\nhttps://comply54.io`
  )
  const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent("https://comply54.io")}&title=${encodeURIComponent(`Blue Team Report: ${mission.title}`)}&summary=${encodeURIComponent(`comply54 blocked a "${record.toolName}" call — ${record.violations[0]?.regulation ?? ""}. Open-source AI governance for African regulations.`)}`

  function copyText() {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
      <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Share this defense</p>
      <pre className="text-[11px] font-mono text-white/40 whitespace-pre-wrap leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5">
        {shareText}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyText}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/45 hover:text-white/70 hover:border-white/20 transition-all"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy text"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/45 hover:text-white/70 hover:border-white/20 transition-all"
        >
          <span className="text-xs font-bold">𝕏</span> Post on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-600/20 bg-blue-600/[0.04] text-xs text-blue-400/60 hover:text-blue-300/80 hover:border-blue-600/35 transition-all"
        >
          <span className="text-xs font-bold">in</span> Share on LinkedIn
        </a>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BlueTeamPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId } = use(params)
  const mission = ALL_MISSIONS.find(m => m.id === missionId) ?? null
  const agent = mission ? getAttackerAgent(mission.agentId) : null

  const [record, setRecord] = useState<BlueTeamRecord | null>(null)
  const [replayResult, setReplayResult] = useState<EnforcementResult | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [replayError, setReplayError] = useState<string | null>(null)
  const [replayMs, setReplayMs] = useState<number | null>(null)

  // Load from localStorage after mount (SSR safety)
  useEffect(() => {
    if (missionId) setRecord(loadBlueTeamRecord(missionId))
  }, [missionId])

  const runReplay = useCallback(async () => {
    if (!record || !mission) return
    setReplaying(true)
    setReplayError(null)
    setReplayResult(null)
    const start = Date.now()
    try {
      const res = await fetch("/api/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: record.toolName,
          action: record.toolName,
          params: record.toolParams,
          sectorClass: record.sectorClass,
          output: "",
          context: {},
        }),
      })
      const elapsed = Date.now() - start
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Network error" }))
        setReplayError(err.error ?? "Enforcement call failed")
      } else {
        const data: EnforcementResult = await res.json()
        setReplayResult(data)
        setReplayMs(elapsed)
      }
    } catch {
      setReplayError("Failed to reach the enforcement API.")
    } finally {
      setReplaying(false)
    }
  }, [record, mission])

  // ── 404 ───────────────────────────────────────────────────────────────────────
  if (!mission) {
    return (
      <div className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/30 text-sm mb-4">Scenario not found.</p>
          <a href="/attacker/missions" className="text-xs text-blue-400/60 hover:text-blue-300 underline">
            Back to scenarios
          </a>
        </div>
      </div>
    )
  }

  // ── No record ──────────────────────────────────────────────────────────────────
  if (!record) {
    return (
      <div className="min-h-screen bg-[#080a0f] text-white">
        <Nav mission={mission} />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🛡</span>
          </div>
          <h2 className="text-xl font-bold text-white/70 mb-2">No defense record yet</h2>
          <p className="text-sm text-white/35 leading-relaxed max-w-sm mx-auto mb-6">
            Complete Scenario {mission.number}: <span className="text-white/55">{mission.title}</span> as Red Team first.
            The Blue Team report is generated automatically when comply54 blocks the winning attack.
          </p>
          <a
            href="/attacker/missions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/55 hover:text-white/80 hover:border-white/20 transition-all"
          >
            Go to scenarios <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  const violations = record.violations ?? []

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <Nav mission={mission} />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-blue-400/50 font-medium">Blue Team Report</span>
            <span className="text-white/10">·</span>
            <span className="text-[10px] text-white/25">Scenario {mission.number}</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">{mission.title}</h1>
          <p className="text-sm text-white/40">
            {agent?.name ?? "AI Agent"} · {mission.difficulty} · {record.attackTurns} turn{record.attackTurns !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Tool intercepted</p>
            <p className="text-sm font-mono font-bold text-red-400 truncate">{record.toolName}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Violations</p>
            <p className="text-2xl font-black text-white">{violations.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Decision</p>
            <DecisionBadge decision="deny" blocked={true} />
          </div>
        </div>

        {/* Intercepted call params */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            Intercepted tool call params
          </h2>
          <ParamsTable params={record.toolParams} />
        </section>

        {/* Violations */}
        {violations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Policy violations ({violations.length})
            </h2>
            <div className="space-y-3">
              {violations.map((v, i) => (
                <ViolationCard key={i} v={v} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Live replay */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Live defense check
            </h2>
            {replayResult && replayMs !== null && (
              <span className="text-[10px] text-white/25 font-mono">{replayMs}ms</span>
            )}
          </div>

          <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.03] p-4">
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Replay the exact intercepted call against the live comply54 enforcement API.
              This confirms the policy is still active — not a cached result.
            </p>

            <button
              onClick={runReplay}
              disabled={replaying}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-sm text-blue-400/80 hover:text-blue-300 hover:border-blue-500/40 hover:bg-blue-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {replaying
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                : <><RefreshCw className="w-4 h-4" /> Run defense check</>
              }
            </button>

            {replayError && (
              <div className="mt-4 flex items-start gap-2 text-xs text-red-400/70">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {replayError}
              </div>
            )}

            {replayResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Result:</span>
                  <DecisionBadge decision={replayResult.decision} blocked={replayResult.blocked} />
                  {replayResult.policyCheckMs !== undefined && (
                    <span className="text-[10px] text-white/25 font-mono ml-auto">{replayResult.policyCheckMs}ms policy check</span>
                  )}
                </div>
                {replayResult.auditId && (
                  <p className="text-[10px] font-mono text-white/20 break-all">
                    Audit ID: {replayResult.auditId}
                  </p>
                )}
                {replayResult.allViolations && replayResult.allViolations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {replayResult.allViolations.map((v, i) => (
                      <ViolationCard key={i} v={v} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* comply54 context */}
        <section className="rounded-xl border border-white/6 bg-white/[0.01] px-5 py-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-blue-400/50 shrink-0 mt-0.5" />
          <div className="text-xs text-white/30 leading-relaxed space-y-1">
            <p>
              <span className="text-white/50 font-medium">comply54</span> evaluated this tool call in real time before execution.
              The enforcement ran in-process with zero network calls — the decision was made before the tool could run.
            </p>
            <p>
              Pack: <span className="font-mono text-white/40">{record.violations[0]?.pack ?? "—"}</span>
              {" · "}
              Jurisdiction: <span className="font-mono text-white/40">{record.violations[0]?.jurisdiction ?? "—"}</span>
            </p>
          </div>
        </section>

        {/* Share */}
        <ShareSection mission={mission} record={record} />

        {/* Footer nav */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/attacker/missions"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
          >
            Back to scenarios <ChevronRight className="w-4 h-4" />
          </a>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function Nav({ mission }: { mission: Mission }) {
  return (
    <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="font-medium text-white/50">Agent Disaster Lab</span>
        </a>
        <span className="text-white/15">/</span>
        <a href="/attacker/missions" className="text-white/40 hover:text-white/60 transition-colors text-[13px]">
          Scenarios
        </a>
        <span className="text-white/15">/</span>
        <span className="flex items-center gap-1.5 text-blue-400/70 text-[13px]">
          <span>🛡</span>
          Blue Team · {mission.title}
        </span>
      </div>
    </nav>
  )
}
