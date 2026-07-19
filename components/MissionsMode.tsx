"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Shield, ShieldX, AlertTriangle, Lock, CheckCircle2, ChevronRight,
  ChevronDown, Send, Loader2, Lightbulb, X, Trophy, Swords,
  ArrowRight, RotateCcw, BookOpen, Zap,
} from "lucide-react"
import {
  TELLER_MISSIONS, DIFFICULTY_COLORS, getUnlockedMissions, TOTAL_POINTS,
  type Mission,
} from "@/lib/missions"
import { getAttackerAgent } from "@/lib/attacker-agents"
import { getStoredApiKey } from "@/lib/openrouter"
import { readSSE } from "@/lib/sse"
import type {
  AttackToolCall, AttackTurn, EnforcementResult, EnforcementViolation,
  MissionCompletion,
} from "@/lib/types"
import type { OpenRouterMessage } from "@/lib/openrouter"

// ── localStorage keys ────────────────────────────────────────────────────────

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
  "nigeria/cbn":        "CBN NIP Framework",
  "nigeria/nfiu-aml":   "NFIU AML/CFT",
  "nigeria/bvn-nin":    "CBN BVN/NIN",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "National Health Act",
  "nigeria/naicom":     "NAICOM Guidelines",
  "kenya/kdpa":         "Kenya DPA 2019",
}

// ── Turn rendering ────────────────────────────────────────────────────────────

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
          <p className="text-[10px] font-medium text-white/40">{enf.primaryViolation.regulation}</p>
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

// ── Debrief card ──────────────────────────────────────────────────────────────

function Debrief({
  mission,
  turnsUsed,
  triggeredViolations,
  onNext,
  onGrid,
}: {
  mission: Mission
  turnsUsed: number
  triggeredViolations: EnforcementViolation[]
  onNext: () => void
  onGrid: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      {/* Header */}
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

      {/* Explain the attack */}
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
                    <span className="font-medium text-white/60">{PACK_LABELS[v.pack] ?? v.pack}</span>
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

      {/* Real-world risk */}
      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-5 py-4">
        <p className="text-[9px] uppercase tracking-widest text-red-400/50 mb-2">Real-world risk</p>
        <p className="text-sm text-white/50 leading-relaxed">{mission.realWorldRisk}</p>
      </div>

      {/* Actions */}
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
    </div>
  )
}

// ── Mission grid card ─────────────────────────────────────────────────────────

function MissionCard({
  mission,
  completed,
  locked,
  onClick,
}: {
  mission: Mission
  completed: boolean
  locked: boolean
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
        {!locked && !completed && (
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
        )}
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "grid" | "active" | "debrief"
const AGENT = getAttackerAgent("teller-ai")!

export function MissionsMode() {
  // Persistence
  const [completions, setCompletions] = useState<MissionCompletion[]>([])
  const completedIds = new Set(completions.map(c => c.missionId))
  const totalEarned = completions.reduce((s, c) => s + c.pointsEarned, 0)

  // Phase
  const [phase, setPhase] = useState<Phase>("grid")
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

  // Load completions from localStorage
  useEffect(() => {
    setCompletions(loadCompletions())
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns, currentTurn])

  // Focus input in active phase
  useEffect(() => {
    if (phase === "active") inputRef.current?.focus()
  }, [phase])

  // ── Phase transitions ────────────────────────────────────────────────────────

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
    setLastTriggeredViolations(violations)
    setMissionComplete(true)
    setPhase("debrief")
  }, [completions])

  const getNextMission = () => {
    if (!activeMission) return null
    const missions = TELLER_MISSIONS
    const nextIdx = missions.findIndex(m => m.id === activeMission.id) + 1
    if (nextIdx < missions.length) return missions[nextIdx]
    return null
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!activeMission || !input.trim() || isStreaming || missionComplete) return

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
    // Track tool names by call id (for mission detection in enforcement events)
    const toolCallNames = new Map<string, string>()
    let missionHit = false

    try {
      const res = await fetch("/api/attacker", {
        method: "POST",
        headers,
        body: JSON.stringify({ agentId: AGENT.id, messages: requestMessages }),
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
            if (
              !missionHit &&
              toolName === activeMission.targetToolName &&
              d.enforcement.blocked
            ) {
              const violations = d.enforcement.allViolations ?? (d.enforcement.primaryViolation ? [d.enforcement.primaryViolation] : [])
              const targetHit = violations.some(v => v.pack === activeMission.targetPack)
              if (targetHit) {
                missionHit = true
              }
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
        // Defer to next tick so state is clean
        setTimeout(() => completeMission(activeMission, next.length, allViolations), 50)
      } else {
        // Increment attempt count and maybe show next hint
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
  }, [activeMission, input, isStreaming, missionComplete, messages, attemptCount, completeMission])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const unlockedMissions = getUnlockedMissions(TELLER_MISSIONS, completedIds.size)
  const unlockedIds = new Set(unlockedMissions.map(m => m.id))

  // ── Render: grid ─────────────────────────────────────────────────────────────

  const renderGrid = () => (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🏦</span>
              <h1 className="text-2xl font-bold text-white">TellerAI — NexaPay Digital Bank</h1>
            </div>
            <p className="text-sm text-white/40">Nigerian Fintech · {TELLER_MISSIONS.length} missions · {TOTAL_POINTS} total points</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-white tabular-nums">{totalEarned}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/25">/ {TOTAL_POINTS} pts</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/25">
            <span>{completedIds.size}/{TELLER_MISSIONS.length} missions completed</span>
            <span>{unlockedIds.size - completedIds.size} unlocked and waiting</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${(completedIds.size / TELLER_MISSIONS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mission grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TELLER_MISSIONS.map(mission => (
          <MissionCard
            key={mission.id}
            mission={mission}
            completed={completedIds.has(mission.id)}
            locked={!unlockedIds.has(mission.id)}
            onClick={() => startMission(mission)}
          />
        ))}
      </div>

      {completedIds.size === TELLER_MISSIONS.length && (
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-5 text-center">
          <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-bold text-white text-lg">All missions complete!</p>
          <p className="text-sm text-white/40 mt-1">You discovered every regulatory vulnerability in TellerAI. {TOTAL_POINTS} points earned.</p>
        </div>
      )}
    </div>
  )

  // ── Render: active ────────────────────────────────────────────────────────────

  const renderActive = () => {
    if (!activeMission) return null
    const hint = activeHintIdx >= 0 ? activeMission.hints[activeHintIdx] : null

    return (
      <div className="flex h-[calc(100vh-57px)]">
        {/* Conversation column */}
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
                placeholder={`Attack ${AGENT.name}… ⌘↵ to send`}
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
            {/* Score */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1.5">Score</p>
              <p className="text-2xl font-black text-white tabular-nums">{totalEarned}</p>
              <p className="text-[10px] text-white/25">/ {TOTAL_POINTS} pts</p>
            </div>

            {/* Mission progress */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Missions</p>
              <div className="space-y-1">
                {TELLER_MISSIONS.slice(0, 6).map(m => (
                  <div key={m.id} className={`flex items-center gap-2 text-[10px] ${
                    completedIds.has(m.id) ? "text-emerald-400" :
                    m.id === activeMission.id ? "text-white/60" :
                    "text-white/20"
                  }`}>
                    {completedIds.has(m.id)
                      ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                      : m.id === activeMission.id
                        ? <Swords className="w-3 h-3 shrink-0" />
                        : <div className="w-3 h-3 rounded-full border border-white/10 shrink-0" />
                    }
                    <span className="truncate">{m.title}</span>
                  </div>
                ))}
                {TELLER_MISSIONS.length > 6 && (
                  <p className="text-[9px] text-white/15">+{TELLER_MISSIONS.length - 6} more</p>
                )}
              </div>
            </div>

            {/* Attempts */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Attempts</p>
              <p className="text-xl font-bold text-white/60 tabular-nums">{attemptCount}</p>
            </div>

            {/* OWASP tag */}
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
    const nextUnlocked = nextMission ? unlockedIds.has(nextMission.id) || completedIds.size >= nextMission.minCompleted : false

    return (
      <Debrief
        mission={activeMission}
        turnsUsed={turns.length}
        triggeredViolations={lastTriggeredViolations}
        onNext={() => {
          if (nextMission) startMission(nextMission)
          else setPhase("grid")
        }}
        onGrid={() => setPhase("grid")}
      />
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-white/50">Agent Disaster Lab</span>
          </a>
          <span className="text-white/15">/</span>
          <a href="/attacker" className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400/80">Attacker Mode</span>
          </a>
          <span className="text-white/15">/</span>
          <span className="text-sm text-white/60 font-medium">Missions</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Trophy className="w-3.5 h-3.5 text-yellow-400/60" />
            <span className="tabular-nums">{totalEarned}</span>
            <span className="text-white/15">/ {TOTAL_POINTS}</span>
          </div>
          {completedIds.size > 0 && (
            <button
              onClick={() => { setCompletions([]); saveCompletions([]) }}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
          <a href="/attacker/explore" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            Free exploration →
          </a>
        </div>
      </nav>

      {phase === "grid"    && renderGrid()}
      {phase === "active"  && renderActive()}
      {phase === "debrief" && renderDebrief()}
    </div>
  )
}
