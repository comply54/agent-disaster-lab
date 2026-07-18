"use client"

import { useState } from "react"
import { Check, Share2, Shield, RotateCcw, ExternalLink } from "lucide-react"
import type { AttackerAgent, AttackTurn } from "@/lib/types"

const PACK_LABELS: Record<string, string> = {
  "nigeria/cbn":        "CBN NIP Framework",
  "nigeria/nfiu-aml":   "NFIU AML/CFT Regulations",
  "nigeria/bvn-nin":    "CBN BVN/NIN Framework",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "National Health Act 2014",
  "nigeria/naicom":     "NAICOM Guidelines",
  "kenya/kdpa":         "Kenya DPA 2019",
  "south-africa/popia": "POPIA",
  "ghana/dpa":          "Ghana DPA 2012",
}

interface Props {
  agent: AttackerAgent
  turns: AttackTurn[]
  regulationsTriggered: Set<string>
  blocksTotal: number
  onRestart: () => void
  onNewAgent: () => void
}

export function AttackReport({ agent, turns, regulationsTriggered, blocksTotal, onRestart, onNewAgent }: Props) {
  const [copied, setCopied] = useState(false)

  const score = agent.totalRegulations > 0
    ? Math.round((regulationsTriggered.size / agent.totalRegulations) * 100)
    : 0

  const scoreColor =
    score >= 80 ? "text-red-400"   :
    score >= 50 ? "text-amber-400" :
    score >= 25 ? "text-yellow-400" :
    "text-emerald-400"

  const scoreLabel =
    score >= 80 ? "Maximum exposure discovered" :
    score >= 50 ? "Significant exposure found"   :
    score >= 25 ? "Partial coverage"              :
    "Low coverage this session"

  const handleShare = async () => {
    const lines = [
      `🔴 comply54 Attacker Mode — ${agent.name} (${agent.organization})`,
      ``,
      `Session: ${turns.length} attack${turns.length !== 1 ? "s" : ""} · ${blocksTotal} blocked by comply54`,
      `Regulation coverage: ${regulationsTriggered.size}/${agent.totalRegulations} (${score}%)`,
      ``,
      `Regulations triggered:`,
      ...[...regulationsTriggered].map((p) => `  • ${PACK_LABELS[p] ?? p}`),
      ``,
      `Every violation was intercepted in real-time.`,
      `Try it: ${window.location.origin}/attacker`,
    ]
    await navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-white/20">Session complete</p>
        <h2 className="text-2xl font-bold text-white">Attack Report</h2>
        <p className="text-sm text-white/40">
          {agent.emoji} {agent.name} · {agent.organization}
        </p>
      </div>

      {/* Score */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-8 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Threat Coverage</p>
        <p className={`text-6xl font-black tabular-nums ${scoreColor}`}>{score}%</p>
        <p className="text-sm text-white/40">{scoreLabel}</p>
        <div className="mt-4 w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              score >= 80 ? "bg-red-500"   :
              score >= 50 ? "bg-amber-500" :
              score >= 25 ? "bg-yellow-500" :
              "bg-emerald-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Attacks sent",    value: turns.length },
          { label: "Blocked",         value: blocksTotal },
          { label: "Regs discovered", value: regulationsTriggered.size },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4 text-center">
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/25 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Regulation map */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-3">Regulation Map</p>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden divide-y divide-white/5">
          {agent.packs.map((pack) => {
            const triggered = regulationsTriggered.has(pack)
            return (
              <div key={pack} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  triggered ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/15"
                }`}>
                  {triggered ? <Shield className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/15" />}
                </span>
                <span className={`text-sm font-medium ${triggered ? "text-white/80" : "text-white/25"}`}>
                  {PACK_LABELS[pack] ?? pack}
                </span>
                {triggered && (
                  <span className="ml-auto text-[10px] uppercase tracking-widest text-red-400/70 font-medium">
                    Triggered
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Turn summary */}
      {turns.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/20 mb-3">Attack Timeline</p>
          <div className="space-y-2">
            {turns.map((turn, i) => {
              const blocked = turn.toolCalls.some((tc) => tc.enforcement.blocked)
              return (
                <div key={turn.id} className="flex items-start gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-4 py-3">
                  <span className="text-[10px] text-white/20 font-mono mt-0.5 w-5 shrink-0">{i + 1}</span>
                  <p className="text-xs text-white/50 flex-1 leading-relaxed truncate">{turn.userPrompt}</p>
                  <span className={`text-[10px] font-medium shrink-0 ${blocked ? "text-red-400/70" : "text-green-400/70"}`}>
                    {blocked ? "BLOCKED" : "PASSED"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* comply54 CTA */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-6 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-white/40 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">
              comply54 blocked every violation in real-time.
            </p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Add the same enforcement to your own AI agent in 3 lines of code.
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/6 px-4 py-3 font-mono text-xs text-white/60">
          <span className="text-violet-400">import</span>{" "}
          <span className="text-amber-300/80">{"{ NigeriaFintechCompliance }"}</span>{" "}
          <span className="text-violet-400">from</span>{" "}
          <span className="text-amber-300/80">"@comply54/core"</span>
          <br />
          <span className="text-violet-400">const</span> compliance{" "}
          <span className="text-white/30">=</span>{" "}
          <span className="text-violet-400">new</span> NigeriaFintechCompliance()
          <br />
          <span className="text-violet-400">const</span> result{" "}
          <span className="text-white/30">=</span> compliance.
          <span className="text-violet-400">check</span>(action, params, output, context)
        </div>
        <a
          href="https://comply54.io/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Read the docs →
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Attack again
        </button>
        <button
          onClick={onNewAgent}
          className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/60 hover:text-white/90 hover:border-white/20 transition-all"
        >
          Try another agent
        </button>
        <button
          onClick={handleShare}
          className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Share results"}
        </button>
      </div>
    </div>
  )
}
