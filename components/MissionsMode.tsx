"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Shield, ShieldX, AlertTriangle, Lock, CheckCircle2, ChevronRight,
  ChevronDown, Send, Loader2, Lightbulb, X, Trophy, Swords,
  ArrowRight, RotateCcw, BookOpen, ChevronLeft, Copy, Check,
} from "lucide-react"
import {
  ALL_MISSIONS, DIFFICULTY_COLORS, getMissionsForAgent, getUnlockedMissions,
  type Mission,
} from "@/lib/missions"
import { getAttackerAgent } from "@/lib/attacker-agents"
import { getStoredApiKey } from "@/lib/openrouter"
import { readSSE } from "@/lib/sse"
import { useAuth } from "@/lib/auth-context"
import { saveCompletion, syncLocalToDb, loadUserCompletions, fetchCompletionRates } from "@/lib/db"
import type { CompletionRate } from "@/lib/db"
import type {
  AttackToolCall, AttackTurn, EnforcementResult, EnforcementViolation,
  MissionCompletion,
} from "@/lib/types"
import type { OpenRouterMessage } from "@/lib/openrouter"

// ── localStorage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "missions_completions_v1"

function loadCompletions(): MissionCompletion[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") } catch { return [] }
}

function saveCompletions(completions: MissionCompletion[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completions))
}

// ── Shared streaming types ────────────────────────────────────────────────────

interface StreamingTurn {
  thinking: string
  text: string
  toolCalls: AttackToolCall[]
}

interface DonePayload {
  assistantText: string
  toolCalls: Array<{
    id: string
    name: string
    arguments: string
    enforcement: EnforcementResult
  }>
}

// ── Pack label map ────────────────────────────────────────────────────────────

const PACK_LABELS: Record<string, string> = {
  "nigeria/cbn":        "CBN NIP",
  "nigeria/nfiu-aml":   "NFIU AML",
  "nigeria/bvn-nin":    "BVN/NIN",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "NHA 2014",
  "nigeria/naicom":     "NAICOM",
  "kenya/kdpa":         "KDPA 2019",
}

const PACK_LABELS_FULL: Record<string, string> = {
  "nigeria/cbn":        "CBN NIP Framework",
  "nigeria/nfiu-aml":   "NFIU AML/CFT",
  "nigeria/bvn-nin":    "CBN BVN/NIN",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "National Health Act",
  "nigeria/naicom":     "NAICOM Guidelines",
  "kenya/kdpa":         "Kenya DPA 2019",
}

// ── Agent pack metadata ───────────────────────────────────────────────────────

const AGENT_PACK_IDS = ["teller-ai", "records-ai", "claims-ai"] as const

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolCard({ toolCall }: { toolCall: AttackToolCall }) {
  const enf = toolCall.enforcement
  const isPending = !enf.auditId && !enf.blocked && enf.decision === "allow"

  return (
    <div className={`rounded-lg border text-xs p-3 space-y-2 ${
      isPending ? "border-white/8 bg-white/[0.02]" :
      enf.blocked ? "border-red-500/20 bg-red-500/[0.04]" :
      "border-green-500/20 bg-green-500/[0.03]"
    }`}>
      <div className="flex items-center gap-2">
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 text-white/25 animate-spin" />
          : enf.blocked
            ? <ShieldX className="w-3.5 h-3.5 text-red-400" />
            : <Shield className="w-3.5 h-3.5 text-green-400" />
        }
        <span className={`font-mono font-medium ${enf.blocked ? "text-red-300" : isPending ? "text-white/30" : "text-white/60"}`}>
          {toolCall.name}
        </span>
        {!isPending && (
          <span className={`ml-auto text-[10px] font-bold tracking-wider ${enf.blocked ? "text-red-400" : "text-green-400"}`}>
            {enf.blocked ? "BLOCKED" : "ALLOWED"}
          </span>
        )}
      </div>

      {Object.keys(toolCall.params).length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(toolCall.params).map(([k, v]) => (
            <span key={k} className="text-[10px] font-mono text-white/30">
              <span className="text-white/20">{k}:</span>{" "}
              <span className="text-white/45">{String(v).slice(0, 35)}{String(v).length > 35 ? "…" : ""}</span>
            </span>
          ))}
        </div>
      )}

      {enf.blocked && enf.primaryViolation && (
        <div className="border-t border-red-500/10 pt-2 space-y-1">
          <p className="text-[10px] font-medium text-white/40">{PACK_LABELS_FULL[enf.primaryViolation.pack] ?? enf.primaryViolation.regulation}</p>
          {enf.primaryViolation.messages[0] && (
            <p className="text-[11px] text-red-300/70 leading-relaxed">{enf.primaryViolation.messages[0]}</p>
          )}
          {enf.primaryViolation.citations[0] && (
            <p className="text-[10px] text-white/20 font-mono">
              {enf.primaryViolation.citations[0].document} § {enf.primaryViolation.citations[0].section}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TurnRow({ turn }: { turn: AttackTurn }) {
  const [thinkOpen, setThinkOpen] = useState(false)
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/8">
          <p className="text-sm text-white/80 leading-relaxed">{turn.userPrompt}</p>
        </div>
      </div>
      <div className="flex gap-2 items-start max-w-[92%]">
        <div className="mt-1 w-6 h-6 rounded-full bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-[11px]">🤖</div>
        <div className="flex-1 space-y-2">
          {turn.agentThinking && (
            <button onClick={() => setThinkOpen(!thinkOpen)} className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-colors">
              {thinkOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Reasoning
            </button>
          )}
          {thinkOpen && <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/[0.01] text-[11px] text-white/25 font-mono leading-relaxed">{turn.agentThinking}</div>}
          {turn.toolCalls.map(tc => <ToolCard key={tc.id} toolCall={tc} />)}
          {turn.agentText && (
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${
              turn.toolCalls.some(tc => tc.enforcement.blocked)
                ? "bg-red-500/[0.04] border border-red-500/12 text-red-200/55"
                : "bg-white/[0.03] border border-white/5 text-white/55"
            }`}>
              {turn.agentText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StreamRow({ userPrompt, turn }: { userPrompt: string; turn: StreamingTurn }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/8">
          <p className="text-sm text-white/80 leading-relaxed">{userPrompt}</p>
        </div>
      </div>
      <div className="flex gap-2 items-start max-w-[92%]">
        <div className="mt-1 w-6 h-6 rounded-full bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-[11px]">🤖</div>
        <div className="flex-1 space-y-2">
          {(turn.thinking || (!turn.toolCalls.length && !turn.text)) && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <Loader2 className="w-3 h-3 animate-spin" />
              {turn.thinking ? "Reasoning…" : "Thinking…"}
            </div>
          )}
          {turn.toolCalls.map(tc => <ToolCard key={tc.id} toolCall={tc} />)}
          {turn.text && (
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.03] border border-white/5 text-sm text-white/55 leading-relaxed">
              {turn.text}
              <span className="inline-block w-0.5 h-3.5 bg-white/30 ml-0.5 animate-pulse align-text-bottom" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareCard({ mission, turnsUsed }: { mission: Mission; turnsUsed: number }) {
  const [copied, setCopied] = useState(false)
  const agentName = getAttackerAgent(mission.agentId)?.name ?? "the AI agent"

  const shareText = [
    `I just attacked ${agentName} on Agent Disaster Lab 🔴`,
    ``,
    `Mission: ${mission.title} (${mission.difficulty})`,
    `Attacks: ${turnsUsed} · Score: +${mission.points} pts`,
    `comply54 blocked every attempt.`,
    ``,
    `disaster.comply54.io #AIGovernance #comply54`,
  ].join("\n")

  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 space-y-3">
      <p className="text-[9px] uppercase tracking-widest text-white/25 font-medium">Share your result</p>

      {/* Preview */}
      <div className="rounded-lg border border-white/6 bg-[#080a0f] px-4 py-3 font-mono text-[11px] leading-relaxed space-y-0.5">
        <p className="text-white/70 font-semibold">I just attacked {agentName} on Agent Disaster Lab 🔴</p>
        <p className="text-white/0 select-none">&nbsp;</p>
        <p className="text-white/45">Mission: {mission.title} ({mission.difficulty})</p>
        <p className="text-white/45">Attacks: {turnsUsed} · Score: +{mission.points} pts</p>
        <p className="text-white/45">comply54 blocked every attempt.</p>
        <p className="text-white/0 select-none">&nbsp;</p>
        <p className="text-white/30">disaster.comply54.io #AIGovernance #comply54</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
        >
          {copied
            ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
            : <><Copy className="w-3.5 h-3.5" /> Copy text</>
          }
        </button>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
        >
          <span className="font-bold text-sm leading-none">𝕏</span>
          Post on X
        </a>
      </div>
    </div>
  )
}

function DecisionBadge({ decision, blocked }: { decision: string; blocked: boolean }) {
  if (blocked)
    return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">BLOCKED</span>
  if (decision === "escalate")
    return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">ESCALATED</span>
  if (decision === "audit")
    return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">AUDITED</span>
  return <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-white/25 border border-white/8">ALLOWED</span>
}

function Debrief({
  mission,
  turnsUsed,
  triggeredViolations,
  turns,
  onNext,
  onGrid,
}: {
  mission: Mission
  turnsUsed: number
  triggeredViolations: EnforcementViolation[]
  turns: AttackTurn[]
  onNext: () => void
  onGrid: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-5 flex items-start gap-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 mb-1">Mission complete</p>
          <h2 className="text-xl font-bold text-white">
            Mission {mission.number}: {mission.title}
          </h2>
          <p className="text-sm text-white/40 mt-1">+{mission.points} points · {turnsUsed} attack{turnsUsed !== 1 ? "s" : ""}</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-2xl font-black text-emerald-400">+{mission.points}</p>
          <p className="text-[10px] text-white/25 uppercase tracking-widest">points</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium">Explain the attack</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Attack Pattern</p>
            <p className="text-sm font-semibold text-white/70">{mission.attackPattern}</p>
          </div>
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-amber-400/50 mb-1">OWASP {mission.owaspId}</p>
            <p className="text-sm font-semibold text-amber-300/70">{mission.owaspName}</p>
          </div>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">What comply54 blocked</p>
          {triggeredViolations.length > 0 ? (
            <div className="space-y-1.5">
              {triggeredViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ShieldX className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-white/60">{PACK_LABELS_FULL[v.pack] ?? v.pack}</span>
                    {v.messages[0] && <p className="text-white/35 mt-0.5">{v.messages[0]}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40">{mission.successExplanation}</p>
          )}
        </div>

        <div>
          <p className="text-xs text-white/50 leading-relaxed">{mission.successExplanation}</p>
        </div>
      </div>

      {/* ── Attack timeline ── */}
      {turns.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4">
          <p className="text-[9px] uppercase tracking-widest text-white/25 font-medium mb-4">Attack timeline</p>
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-[18px] top-3 bottom-3 w-px bg-white/6" />
            <div className="space-y-3">
              {turns.map((turn, i) => {
                const isLast = i === turns.length - 1
                const primaryCall =
                  turn.toolCalls.find(tc => tc.enforcement.blocked) ??
                  turn.toolCalls.find(tc => tc.enforcement.decision === "escalate") ??
                  turn.toolCalls[0]
                return (
                  <div key={turn.id} className={`flex items-start gap-3 text-xs transition-opacity ${isLast ? "opacity-100" : "opacity-50"}`}>
                    {/* Step dot */}
                    <div className={`relative z-10 w-[9px] h-[9px] rounded-full shrink-0 mt-1 ${
                      isLast ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/15"
                    }`} />
                    {/* Prompt */}
                    <p className="flex-1 text-white/45 leading-relaxed min-w-0 truncate">
                      {turn.userPrompt.length > 72
                        ? turn.userPrompt.slice(0, 72) + "…"
                        : turn.userPrompt}
                    </p>
                    {/* Tool + decision */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {primaryCall ? (
                        <>
                          <span className="font-mono text-[10px] text-white/20">{primaryCall.name}</span>
                          <DecisionBadge decision={primaryCall.enforcement.decision} blocked={primaryCall.enforcement.blocked} />
                        </>
                      ) : (
                        <span className="text-[10px] text-white/15 italic">no tool call</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-5 py-4">
        <p className="text-[9px] uppercase tracking-widest text-red-400/50 mb-2">Real-world risk</p>
        <p className="text-sm text-white/50 leading-relaxed">{mission.realWorldRisk}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
        >
          Next mission <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onGrid}
          className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
        >
          All missions
        </button>
      </div>

      <ShareCard mission={mission} turnsUsed={turnsUsed} />
    </div>
  )
}

function MissionCard({
  mission,
  completed,
  locked,
  completionRate,
  onClick,
}: {
  mission: Mission
  completed: boolean
  locked: boolean
  completionRate?: CompletionRate
  onClick: () => void
}) {
  return (
    <button
      onClick={!locked ? onClick : undefined}
      disabled={locked}
      className={`text-left rounded-xl border p-4 transition-all duration-150 w-full ${
        completed
          ? "border-emerald-500/25 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.06]"
          : locked
            ? "border-white/5 bg-white/[0.01] cursor-not-allowed opacity-50"
            : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-white/20">
          {String(mission.number).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[mission.difficulty]}`}>
            {mission.difficulty}
          </span>
          {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {locked && <Lock className="w-3.5 h-3.5 text-white/20" />}
        </div>
      </div>

      <h3 className={`font-semibold text-sm mb-1 ${locked ? "text-white/20" : "text-white/80"}`}>
        {mission.title}
      </h3>
      <p className={`text-[11px] leading-relaxed mb-3 line-clamp-2 ${locked ? "text-white/15" : "text-white/35"}`}>
        {mission.objective}
      </p>

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${locked ? "text-white/20" : "text-white/40"}`}>
          +{mission.points} pts
        </span>
        <div className="flex items-center gap-2">
          {completionRate && completionRate.totalPlayers >= 3 && (
            <span className={`text-[10px] tabular-nums font-medium ${
              completionRate.rate < 30
                ? "text-red-400/50"
                : completionRate.rate < 70
                  ? "text-amber-400/50"
                  : "text-emerald-400/50"
            }`}>
              {completionRate.rate}% cleared
            </span>
          )}
          {!locked && !completed && (
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "agents" | "grid" | "active" | "debrief"

const GRAND_TOTAL_POINTS = ALL_MISSIONS.reduce((s, m) => s + m.points, 0)

export function MissionsMode() {
  // Auth
  const { user, username, openAuthModal } = useAuth()

  // Persistence
  const [completions, setCompletions] = useState<MissionCompletion[]>([])
  const [completionRates, setCompletionRates] = useState<Record<string, CompletionRate>>({})

  // Phase + agent selection
  const [phase, setPhase] = useState<Phase>("agents")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activeMission, setActiveMission] = useState<Mission | null>(null)

  // Conversation
  const [messages, setMessages] = useState<OpenRouterMessage[]>([])
  const [turns, setTurns] = useState<AttackTurn[]>([])
  const [currentTurn, setCurrentTurn] = useState<StreamingTurn | null>(null)
  const [currentUserPrompt, setCurrentUserPrompt] = useState("")
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mission state
  const [missionComplete, setMissionComplete] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [activeHintIdx, setActiveHintIdx] = useState(-1)
  const [lastTriggeredViolations, setLastTriggeredViolations] = useState<EnforcementViolation[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load completions from localStorage on mount
  useEffect(() => { setCompletions(loadCompletions()) }, [])

  // Fetch global completion rates once on mount (public, no auth needed)
  useEffect(() => { fetchCompletionRates().then(setCompletionRates) }, [])

  // When user signs in, merge DB completions → localStorage + sync local-only ones to DB
  useEffect(() => {
    if (!user) return
    loadUserCompletions().then(dbCompletions => {
      setCompletions(prev => {
        const dbIds = new Set(dbCompletions.map(c => c.missionId))
        const localOnly = prev.filter(c => !dbIds.has(c.missionId))
        const merged = [...dbCompletions, ...localOnly]
        saveCompletions(merged)
        if (localOnly.length > 0) syncLocalToDb(localOnly)
        return merged
      })
    })
  }, [user])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [turns, currentTurn])

  // Focus input in active phase
  useEffect(() => {
    if (phase === "active") inputRef.current?.focus()
  }, [phase])

  // ── Global derived ────────────────────────────────────────────────────────────

  const totalEarned = completions.reduce((s, c) => s + c.pointsEarned, 0)

  // ── Per-agent derived ─────────────────────────────────────────────────────────

  const agentMissions = selectedAgentId ? getMissionsForAgent(selectedAgentId) : []
  const agentTotalPoints = agentMissions.reduce((s, m) => s + m.points, 0)
  const agentCompletedIds = new Set(
    completions
      .filter(c => agentMissions.some(m => m.id === c.missionId))
      .map(c => c.missionId)
  )
  const agentEarned = completions
    .filter(c => agentMissions.some(m => m.id === c.missionId))
    .reduce((s, c) => s + c.pointsEarned, 0)
  const unlockedMissions = getUnlockedMissions(agentMissions, agentCompletedIds.size)
  const unlockedIds = new Set(unlockedMissions.map(m => m.id))

  // ── Phase transitions ─────────────────────────────────────────────────────────

  const selectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
    setPhase("grid")
  }

  const startMission = (mission: Mission) => {
    setActiveMission(mission)
    setMessages([])
    setTurns([])
    setCurrentTurn(null)
    setCurrentUserPrompt("")
    setInput("")
    setError(null)
    setMissionComplete(false)
    setAttemptCount(0)
    setActiveHintIdx(-1)
    setLastTriggeredViolations([])
    setPhase("active")
  }

  const completeMission = useCallback((mission: Mission, turnCount: number, violations: EnforcementViolation[]) => {
    const completion: MissionCompletion = {
      missionId: mission.id,
      completedAt: Date.now(),
      pointsEarned: mission.points,
      attackTurns: turnCount,
    }
    const next = [...completions.filter(c => c.missionId !== mission.id), completion]
    setCompletions(next)
    saveCompletions(next)
    if (user) saveCompletion(completion)
    setLastTriggeredViolations(violations)
    setMissionComplete(true)
    setPhase("debrief")
  }, [completions])

  const getNextMission = () => {
    if (!activeMission || !selectedAgentId) return null
    const missions = getMissionsForAgent(selectedAgentId)
    const nextIdx = missions.findIndex(m => m.id === activeMission.id) + 1
    if (nextIdx < missions.length) return missions[nextIdx]
    return null
  }

  // ── Send message ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!activeMission || !selectedAgentId || !input.trim() || isStreaming || missionComplete) return

    const userContent = input.trim()
    setInput("")
    setIsStreaming(true)
    setError(null)
    setCurrentUserPrompt(userContent)

    const userMsg: OpenRouterMessage = { role: "user", content: userContent }
    const requestMessages = [...messages, userMsg]

    const turnId = crypto.randomUUID()
    setCurrentTurn({ thinking: "", text: "", toolCalls: [] })

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const storedKey = getStoredApiKey()
    if (storedKey) headers["x-api-key"] = storedKey

    let thinkingAcc = ""
    let assistantTextAcc = ""
    let streamToolCalls: AttackToolCall[] = []
    let doneData: DonePayload | null = null
    const toolCallNames = new Map<string, string>()
    let missionHit = false

    try {
      const res = await fetch("/api/attacker", {
        method: "POST",
        headers,
        body: JSON.stringify({ agentId: selectedAgentId, messages: requestMessages }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message ?? `Request failed (${res.status})`)
        setIsStreaming(false)
        setCurrentTurn(null)
        setCurrentUserPrompt("")
        return
      }

      if (!res.body) {
        setError("No response body")
        setIsStreaming(false)
        setCurrentTurn(null)
        setCurrentUserPrompt("")
        return
      }

      for await (const { event, data } of readSSE(res.body)) {
        switch (event) {
          case "thinking": {
            const d = data as { content: string }
            thinkingAcc += d.content
            setCurrentTurn(prev => prev ? { ...prev, thinking: thinkingAcc } : null)
            break
          }
          case "delta": {
            const d = data as { content: string }
            assistantTextAcc += d.content
            setCurrentTurn(prev => prev ? { ...prev, text: assistantTextAcc } : null)
            break
          }
          case "tool_call": {
            const d = data as { id: string; toolName: string; params: Record<string, unknown> }
            toolCallNames.set(d.id, d.toolName)
            const pending: AttackToolCall = {
              id: d.id,
              name: d.toolName,
              params: d.params,
              enforcement: { decision: "allow", blocked: false, auditId: "", evaluatedAt: "" } as EnforcementResult,
            }
            streamToolCalls = [...streamToolCalls, pending]
            setCurrentTurn(prev => prev ? { ...prev, toolCalls: streamToolCalls } : null)
            break
          }
          case "enforcement": {
            const d = data as { id: string; enforcement: EnforcementResult }
            streamToolCalls = streamToolCalls.map(tc =>
              tc.id === d.id ? { ...tc, enforcement: d.enforcement } : tc
            )
            setCurrentTurn(prev => prev ? { ...prev, toolCalls: streamToolCalls } : null)

            // Mission detection
            const toolName = toolCallNames.get(d.id)
            if (!missionHit && toolName === activeMission.targetToolName && d.enforcement.blocked) {
              const violations = d.enforcement.allViolations ?? (d.enforcement.primaryViolation ? [d.enforcement.primaryViolation] : [])
              if (violations.some(v => v.pack === activeMission.targetPack)) missionHit = true
            }
            break
          }
          case "error": {
            const d = data as { message: string }
            setError(d.message)
            break
          }
          case "done": {
            doneData = data as DonePayload
            break
          }
        }
      }
    } catch (err) {
      setError(String(err))
      setIsStreaming(false)
      setCurrentTurn(null)
      setCurrentUserPrompt("")
      return
    }

    const finalAssistantText = doneData?.assistantText ?? assistantTextAcc
    const rawToolCalls = doneData?.toolCalls ?? []

    const finalTurn: AttackTurn = {
      id: turnId,
      userPrompt: userContent,
      agentThinking: thinkingAcc,
      agentText: finalAssistantText,
      toolCalls: rawToolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        params: (() => { try { return JSON.parse(tc.arguments) } catch { return {} } })(),
        enforcement: tc.enforcement,
      })),
      timestamp: Date.now(),
    }

    setTurns(prev => {
      const next = [...prev, finalTurn]
      if (missionHit) {
        const allViolations = rawToolCalls.flatMap(tc =>
          tc.enforcement.allViolations ?? (tc.enforcement.primaryViolation ? [tc.enforcement.primaryViolation] : [])
        )
        setTimeout(() => completeMission(activeMission, next.length, allViolations), 50)
      } else {
        const newAttempt = attemptCount + 1
        setAttemptCount(newAttempt)
        const hintIdx = Math.min(newAttempt - 1, activeMission.hints.length - 1)
        if (newAttempt >= 2) setActiveHintIdx(hintIdx)
      }
      return next
    })

    setCurrentTurn(null)
    setCurrentUserPrompt("")

    const assistantMsg: OpenRouterMessage = {
      role: "assistant",
      content: finalAssistantText || null,
      ...(rawToolCalls.length > 0 ? {
        tool_calls: rawToolCalls.map(tc => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      } : {}),
    }

    const toolResultMsgs: OpenRouterMessage[] = rawToolCalls.map(tc => ({
      role: "tool" as const,
      content: tc.enforcement.blocked
        ? `BLOCKED by comply54: ${tc.enforcement.primaryViolation?.messages[0] ?? "Compliance violation"}`
        : "Tool executed successfully.",
      tool_call_id: tc.id,
    }))

    setMessages([...requestMessages, assistantMsg, ...toolResultMsgs])
    setIsStreaming(false)
  }, [activeMission, selectedAgentId, input, isStreaming, missionComplete, messages, attemptCount, completeMission])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render: agents ────────────────────────────────────────────────────────────

  const renderAgents = () => (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[10px] font-medium mb-4">
          <BookOpen className="w-3 h-3" />
          25 missions · 3 agents · 525 pts total
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Choose your target</h1>
        <p className="text-sm text-white/40 max-w-md leading-relaxed">
          Each agent pack covers a different regulatory domain. Complete missions by convincing the agent to attempt a blocked tool call.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENT_PACK_IDS.map(agentId => {
          const agent = getAttackerAgent(agentId)!
          const missions = getMissionsForAgent(agentId)
          const packTotal = missions.reduce((s, m) => s + m.points, 0)
          const packCompletions = completions.filter(c => missions.some(m => m.id === c.missionId))
          const packCompleted = packCompletions.length
          const packEarned = packCompletions.reduce((s, c) => s + c.pointsEarned, 0)
          const allDone = packCompleted === missions.length

          return (
            <button
              key={agentId}
              onClick={() => selectAgent(agentId)}
              className="text-left rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-150 p-5 group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{agent.emoji}</span>
                {allDone ? (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full tracking-wider">
                    CLEARED
                  </span>
                ) : packCompleted > 0 ? (
                  <span className="text-[9px] text-white/30 tabular-nums">
                    {packCompleted}/{missions.length}
                  </span>
                ) : null}
              </div>

              <h3 className="font-bold text-base text-white/90 mb-0.5">{agent.name}</h3>
              <p className="text-[11px] text-white/35 mb-3">{agent.organization}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {agent.packs.map(pack => (
                  <span key={pack} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-white/30">
                    {PACK_LABELS[pack] ?? pack}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/30">{packCompleted}/{missions.length} missions</span>
                  <span className="text-white/25 tabular-nums">{packEarned}/{packTotal} pts</span>
                </div>
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: missions.length > 0 ? `${(packCompleted / missions.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-white/20">{agent.sector}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-8 rounded-xl border border-white/6 bg-white/[0.01] px-5 py-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <p className="text-xs text-white/30 leading-relaxed">
          <span className="text-white/50 font-medium">Success = getting the agent to ATTEMPT a regulated tool call.</span>{" "}
          comply54 blocks every violation before execution. Your goal is to discover how many regulations you can trigger across each sector.
        </p>
      </div>
    </div>
  )

  // ── Render: grid ──────────────────────────────────────────────────────────────

  const renderGrid = () => {
    const agent = selectedAgentId ? getAttackerAgent(selectedAgentId) : null
    if (!agent) return null

    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <button
            onClick={() => { setSelectedAgentId(null); setPhase("agents") }}
            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors mb-4"
          >
            <ChevronLeft className="w-3 h-3" /> All packs
          </button>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-2xl">{agent.emoji}</span>
                <h1 className="text-2xl font-bold text-white">{agent.name} — {agent.organization}</h1>
              </div>
              <p className="text-sm text-white/40">{agent.sector} · {agentMissions.length} missions · {agentTotalPoints} total points</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-white tabular-nums">{agentEarned}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/25">/ {agentTotalPoints} pts</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/25">
              <span>{agentCompletedIds.size}/{agentMissions.length} missions completed</span>
              <span>{unlockedIds.size - agentCompletedIds.size} unlocked and waiting</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: agentMissions.length > 0 ? `${(agentCompletedIds.size / agentMissions.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentMissions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              completed={agentCompletedIds.has(mission.id)}
              locked={!unlockedIds.has(mission.id)}
              completionRate={completionRates[mission.id]}
              onClick={() => startMission(mission)}
            />
          ))}
        </div>

        {agentCompletedIds.size === agentMissions.length && agentMissions.length > 0 && (
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-5 text-center">
            <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-white text-lg">All missions complete!</p>
            <p className="text-sm text-white/40 mt-1">
              You discovered every regulatory vulnerability in {agent.name}. {agentTotalPoints} points earned.
            </p>
            <button
              onClick={() => { setSelectedAgentId(null); setPhase("agents") }}
              className="mt-4 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Try another agent →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Render: active ────────────────────────────────────────────────────────────

  const renderActive = () => {
    if (!activeMission || !selectedAgentId) return null
    const agent = getAttackerAgent(selectedAgentId)
    const hint = activeHintIdx >= 0 ? activeMission.hints[activeHintIdx] : null

    return (
      <div className="flex h-[calc(100vh-57px)]">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mission banner */}
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-mono text-white/20 shrink-0">
                  MISSION {String(activeMission.number).padStart(2, "0")}
                </span>
                <span className="text-white/10">·</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${DIFFICULTY_COLORS[activeMission.difficulty]}`}>
                  {activeMission.difficulty}
                </span>
                <h2 className="font-semibold text-sm text-white/80 truncate">{activeMission.title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-white/25">+{activeMission.points} pts</span>
                <button
                  onClick={() => setPhase("grid")}
                  className="text-[10px] text-white/25 hover:text-white/50 transition-colors border border-white/8 px-2 py-1 rounded-md"
                >
                  Abandon
                </button>
              </div>
            </div>
            <p className="text-xs text-white/35 mt-1.5 leading-relaxed">{activeMission.objective}</p>
          </div>

          {/* Scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {turns.length === 0 && !currentTurn && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-2">
                <Swords className="w-7 h-7 text-white/10" />
                <p className="text-sm text-white/20">{activeMission.context}</p>
              </div>
            )}
            {turns.map(t => <TurnRow key={t.id} turn={t} />)}
            {currentTurn && <StreamRow userPrompt={currentUserPrompt} turn={currentTurn} />}
          </div>

          {/* Hint bar */}
          {hint && (
            <div className="px-4 py-2.5 border-t border-amber-500/10 bg-amber-500/[0.03] shrink-0 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-amber-400/70 font-medium">Hint {activeHintIdx + 1}</p>
                <p className="text-[11px] text-white/40 leading-relaxed">{hint}</p>
              </div>
              <button
                onClick={() => { setInput(activeMission.samplePrompts[0] ?? ""); inputRef.current?.focus() }}
                className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors border border-amber-500/20 px-2 py-1 rounded shrink-0"
              >
                Try example
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 border-t border-red-500/15 bg-red-500/[0.03] shrink-0 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300/70 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-white/20 hover:text-white/40"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5 shrink-0">
            <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 focus-within:border-white/15 transition-colors">
              <span className="text-red-500 font-mono text-sm mt-0.5 shrink-0 select-none">›</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Attack ${agent?.name ?? "agent"}… ⌘↵ to send`}
                disabled={isStreaming || missionComplete}
                rows={1}
                className="flex-1 bg-transparent outline-none text-sm text-white/80 placeholder:text-white/20 resize-none leading-relaxed disabled:opacity-40"
                style={{ minHeight: "1.5rem", maxHeight: "8rem" }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement
                  el.style.height = "auto"
                  el.style.height = el.scrollHeight + "px"
                }}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim() || missionComplete}
                className="shrink-0 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:flex w-56 flex-col border-l border-white/5 overflow-y-auto shrink-0">
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Score</p>
              <p className="text-2xl font-black text-white tabular-nums">{agentEarned}</p>
              <p className="text-[10px] text-white/25">/ {agentTotalPoints} pts</p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Missions</p>
              <div className="space-y-1">
                {agentMissions.slice(0, 7).map(m => (
                  <div key={m.id} className={`flex items-center gap-2 text-[10px] ${
                    agentCompletedIds.has(m.id) ? "text-emerald-400" :
                    m.id === activeMission.id ? "text-white/60" :
                    "text-white/20"
                  }`}>
                    {agentCompletedIds.has(m.id)
                      ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                      : m.id === activeMission.id
                        ? <Swords className="w-3 h-3 shrink-0" />
                        : <div className="w-3 h-3 rounded-full border border-white/10 shrink-0" />
                    }
                    <span className="truncate">{m.title}</span>
                  </div>
                ))}
                {agentMissions.length > 7 && (
                  <p className="text-[9px] text-white/15">+{agentMissions.length - 7} more</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Attempts</p>
              <p className="text-xl font-bold text-white/60 tabular-nums">{attemptCount}</p>
            </div>

            <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-widest text-amber-400/50 mb-0.5">{activeMission.owaspId}</p>
              <p className="text-[11px] text-amber-300/60 font-medium">{activeMission.owaspName}</p>
            </div>
          </div>
        </aside>
      </div>
    )
  }

  // ── Render: debrief ───────────────────────────────────────────────────────────

  const renderDebrief = () => {
    if (!activeMission) return null
    const nextMission = getNextMission()

    return (
      <div>
        <Debrief
          mission={activeMission}
          turnsUsed={turns.length}
          triggeredViolations={lastTriggeredViolations}
          turns={turns}
          onNext={() => {
            if (nextMission) startMission(nextMission)
            else setPhase("grid")
          }}
          onGrid={() => setPhase("grid")}
        />
        {/* Sign-in CTA — only for anonymous users */}
        {!user && (
          <div className="max-w-2xl mx-auto px-4 pb-10 -mt-2">
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-5 py-4 flex items-center gap-4">
              <Trophy className="w-7 h-7 text-yellow-400/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70">Your score isn&apos;t on the leaderboard</p>
                <p className="text-xs text-white/35 mt-0.5">Sign in to save your progress and compete globally.</p>
              </div>
              <button
                onClick={openAuthModal}
                className="shrink-0 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────────

  const selectedAgent = selectedAgentId ? getAttackerAgent(selectedAgentId) : null

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm overflow-hidden">
          <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors shrink-0">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-medium text-white/50">Agent Disaster Lab</span>
          </a>
          <span className="text-white/15">/</span>
          <a href="/attacker" className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors shrink-0">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400/80">Attacker Mode</span>
          </a>
          <span className="text-white/15">/</span>
          {selectedAgent && phase !== "agents" ? (
            <>
              <button
                onClick={() => { setSelectedAgentId(null); setPhase("agents") }}
                className="text-white/40 hover:text-white/60 transition-colors shrink-0"
              >
                Missions
              </button>
              <span className="text-white/15">/</span>
              <span className="text-white/60 font-medium truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <span className="text-white/60 font-medium">Missions</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Trophy className="w-3.5 h-3.5 text-yellow-400/60" />
            <span className="tabular-nums">{totalEarned}</span>
            <span className="text-white/15">/ {GRAND_TOTAL_POINTS}</span>
          </div>
          <a
            href="/leaderboard"
            className="text-xs text-white/25 hover:text-white/50 transition-colors hidden sm:block"
          >
            Leaderboard
          </a>
          {completions.length > 0 && (
            <button
              onClick={() => { setCompletions([]); saveCompletions([]) }}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-1.5 text-xs text-white/40 border border-white/8 px-2.5 py-1 rounded-lg">
              <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50">
                {username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="max-w-[80px] truncate">{username ?? "…"}</span>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors border border-white/8 px-2.5 py-1 rounded-lg hover:border-white/20"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {phase === "agents"  && renderAgents()}
      {phase === "grid"    && renderGrid()}
      {phase === "active"  && renderActive()}
      {phase === "debrief" && renderDebrief()}
    </div>
  )
}
