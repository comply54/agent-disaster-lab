"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Shield, ShieldX, AlertTriangle, ChevronLeft, Send, Key,
  Loader2, ChevronDown, ChevronRight, Lightbulb, Trophy, X,
  FlaskConical, Target, Swords,
} from "lucide-react"
import { attackerAgents } from "@/lib/attacker-agents"
import { getPatternAfterBlock } from "@/lib/attack-patterns"
import { AttackReport } from "@/components/AttackReport"
import { getStoredApiKey, storeApiKey } from "@/lib/openrouter"
import { readSSE } from "@/lib/sse"
import type {
  AttackerAgent, AttackTurn, AttackToolCall, EnforcementResult, EnforcementViolation
} from "@/lib/types"
import type { OpenRouterMessage } from "@/lib/openrouter"
import type { AttackPattern } from "@/lib/attack-patterns"

// ── Helper types ──────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<AttackerAgent["difficulty"], string> = {
  Beginner:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
  Intermediate: "text-amber-400 border-amber-500/30 bg-amber-500/8",
  Advanced:     "text-red-400 border-red-500/30 bg-red-500/8",
}

const PACK_LABELS: Record<string, string> = {
  "nigeria/cbn":        "CBN NIP",
  "nigeria/nfiu-aml":   "NFIU AML",
  "nigeria/bvn-nin":    "CBN BVN/NIN",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "NHA 2014",
  "nigeria/naicom":     "NAICOM",
  "kenya/kdpa":         "KDPA 2019",
}

function ViolationBadge({ v }: { v: EnforcementViolation }) {
  const style =
    v.decision === "deny"     ? "text-red-400 bg-red-500/10 border-red-500/20"    :
    v.decision === "escalate" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${style}`}>
      {v.decision === "deny" ? <ShieldX className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
      {v.decision.toUpperCase()}
    </span>
  )
}

const PACK_FULL_LABELS: Record<string, string> = {
  "nigeria/cbn":        "CBN NIP Framework",
  "nigeria/nfiu-aml":   "NFIU AML/CFT Regulations",
  "nigeria/bvn-nin":    "CBN BVN/NIN Framework",
  "nigeria/ndpa":       "NDPA 2023",
  "nigeria/nha":        "National Health Act",
  "nigeria/naicom":     "NAICOM Guidelines",
  "kenya/kdpa":         "Kenya DPA 2019",
}

function EnforcementCard({ toolCall }: { toolCall: AttackToolCall }) {
  const [open, setOpen] = useState(true)
  const [runtimeOpen, setRuntimeOpen] = useState(false)
  const enf = toolCall.enforcement
  const isPending = !enf.auditId && !enf.blocked && enf.decision === "allow"

  const violatedPacks = new Set([
    ...(enf.primaryViolation?.pack ? [enf.primaryViolation.pack] : []),
    ...(enf.allViolations?.map(v => v.pack) ?? []),
  ])

  const violationByPack = new Map(
    enf.allViolations?.map(v => [v.pack, v]) ??
    (enf.primaryViolation ? [[enf.primaryViolation.pack, enf.primaryViolation]] : [])
  )

  return (
    <div className={`rounded-lg border text-xs overflow-hidden ${
      isPending               ? "border-white/8  bg-white/[0.02]" :
      enf.blocked             ? "border-red-500/20 bg-red-500/[0.04]" :
      enf.decision === "audit" ? "border-yellow-500/20 bg-yellow-500/[0.03]" :
      "border-green-500/20 bg-green-500/[0.03]"
    }`}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-white/25 animate-spin shrink-0" />
        ) : enf.blocked ? (
          <ShieldX className="w-3.5 h-3.5 text-red-400 shrink-0" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-green-400 shrink-0" />
        )}
        <span className={`font-mono font-medium ${isPending ? "text-white/30" : enf.blocked ? "text-red-300" : "text-white/60"}`}>
          {toolCall.name}
        </span>
        {!isPending && (
          <span className={`ml-auto font-bold tracking-wider text-[10px] ${
            enf.blocked ? "text-red-400" : enf.decision === "audit" ? "text-yellow-400" : "text-green-400"
          }`}>
            {enf.blocked ? "BLOCKED" : enf.decision.toUpperCase()}
          </span>
        )}
        {!isPending && (
          open ? <ChevronDown className="w-3 h-3 text-white/20 ml-1" /> : <ChevronRight className="w-3 h-3 text-white/20 ml-1" />
        )}
      </button>

      {open && (
        <>
          {/* Params preview */}
          {Object.keys(toolCall.params).length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {Object.entries(toolCall.params).map(([k, v]) => (
                <span key={k} className="text-[10px] text-white/30 font-mono">
                  <span className="text-white/20">{k}:</span>{" "}
                  <span className="text-white/45">{String(v).slice(0, 40)}{String(v).length > 40 ? "…" : ""}</span>
                </span>
              ))}
            </div>
          )}

          {/* Violation details */}
          {enf.blocked && enf.primaryViolation && (
            <div className="px-3 pb-3 border-t border-red-500/10 pt-2 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <ViolationBadge v={enf.primaryViolation} />
                <span className="text-[10px] text-white/40 font-medium">{enf.primaryViolation.regulation}</span>
              </div>
              {enf.primaryViolation.messages.slice(0, 2).map((msg, i) => (
                <p key={i} className="text-[11px] text-red-300/70 leading-relaxed">{msg}</p>
              ))}
              {enf.primaryViolation.citations[0] && (
                <p className="text-[10px] text-white/25 font-mono">
                  {enf.primaryViolation.citations[0].document} § {enf.primaryViolation.citations[0].section}
                </p>
              )}
              {(enf.allViolations?.length ?? 0) > 1 && (
                <p className="text-[10px] text-white/25">
                  +{(enf.allViolations?.length ?? 1) - 1} more violation{(enf.allViolations?.length ?? 1) - 1 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Runtime evaluation panel */}
          {!isPending && (
            <div className="border-t border-white/5">
              <button
                onClick={() => setRuntimeOpen(!runtimeOpen)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
              >
                {runtimeOpen
                  ? <ChevronDown className="w-3 h-3 text-white/15" />
                  : <ChevronRight className="w-3 h-3 text-white/15" />
                }
                <span className="text-[10px] text-white/25 tracking-wide">Runtime evaluation</span>
                {enf.policyCheckMs != null && (
                  <span className="ml-auto text-[10px] font-mono text-white/20">
                    {enf.policyCheckMs}ms
                  </span>
                )}
              </button>

              {runtimeOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Policy list */}
                  {enf.evaluatedPacks && enf.evaluatedPacks.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-white/15 mb-1.5">
                        Policies evaluated
                      </p>
                      <div className="space-y-1">
                        {enf.evaluatedPacks.map(pack => {
                          const violated = violatedPacks.has(pack)
                          const v = violationByPack.get(pack)
                          return (
                            <div key={pack} className="flex items-center gap-2">
                              <span className={`text-[10px] shrink-0 ${violated ? "text-red-400" : "text-green-500/60"}`}>
                                {violated ? "✗" : "✓"}
                              </span>
                              <span className={`text-[10px] font-mono flex-1 ${violated ? "text-white/50" : "text-white/25"}`}>
                                {PACK_FULL_LABELS[pack] ?? pack}
                              </span>
                              {violated && v && (
                                <span className={`text-[9px] font-bold tracking-wider shrink-0 ${
                                  v.decision === "deny"     ? "text-red-400" :
                                  v.decision === "escalate" ? "text-amber-400" :
                                  "text-yellow-400"
                                }`}>
                                  {v.decision.toUpperCase()}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                    <div>
                      <p className="text-[9px] text-white/15 uppercase tracking-widest">Decision</p>
                      <p className={`text-[10px] font-bold tracking-wider mt-0.5 ${
                        enf.blocked ? "text-red-400" :
                        enf.decision === "audit" ? "text-yellow-400" :
                        "text-green-400"
                      }`}>
                        {enf.decision.toUpperCase()}
                      </p>
                    </div>
                    {enf.policyCheckMs != null && (
                      <div>
                        <p className="text-[9px] text-white/15 uppercase tracking-widest">Latency</p>
                        <p className="text-[10px] font-mono text-white/40 mt-0.5">{enf.policyCheckMs}ms</p>
                      </div>
                    )}
                    {enf.auditId && (
                      <div className="min-w-0">
                        <p className="text-[9px] text-white/15 uppercase tracking-widest">Audit ID</p>
                        <p className="text-[10px] font-mono text-white/25 mt-0.5 truncate">{enf.auditId.slice(0, 16)}…</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TurnBubble({ turn }: { turn: AttackTurn }) {
  const [thinkingOpen, setThinkingOpen] = useState(false)
  const anyBlocked = turn.toolCalls.some(tc => tc.enforcement.blocked)

  return (
    <div className="space-y-2">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/8">
          <p className="text-sm text-white/80 leading-relaxed">{turn.userPrompt}</p>
        </div>
      </div>

      {/* Agent response */}
      <div className="flex gap-2 items-start max-w-[92%]">
        <div className="mt-1 w-6 h-6 rounded-full bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-[11px]">
          🤖
        </div>
        <div className="flex-1 space-y-2">
          {/* Thinking */}
          {turn.agentThinking && (
            <button
              onClick={() => setThinkingOpen(!thinkingOpen)}
              className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/40 transition-colors"
            >
              {thinkingOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Agent reasoning
            </button>
          )}
          {thinkingOpen && turn.agentThinking && (
            <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/[0.01] text-[11px] text-white/30 font-mono leading-relaxed">
              {turn.agentThinking}
            </div>
          )}

          {/* Tool calls */}
          {turn.toolCalls.map(tc => (
            <EnforcementCard key={tc.id} toolCall={tc} />
          ))}

          {/* Text response */}
          {turn.agentText && (
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${
              anyBlocked
                ? "bg-red-500/[0.05] border border-red-500/15 text-red-200/60"
                : "bg-white/[0.03] border border-white/5 text-white/60"
            }`}>
              {turn.agentText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StreamingBubble({ userPrompt, turn }: { userPrompt: string; turn: StreamingTurn }) {
  return (
    <div className="space-y-2">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/8">
          <p className="text-sm text-white/80 leading-relaxed">{userPrompt}</p>
        </div>
      </div>

      {/* Agent */}
      <div className="flex gap-2 items-start max-w-[92%]">
        <div className="mt-1 w-6 h-6 rounded-full bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-[11px]">
          🤖
        </div>
        <div className="flex-1 space-y-2">
          {/* Thinking indicator */}
          {turn.thinking && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <Loader2 className="w-3 h-3 animate-spin" />
              Reasoning…
            </div>
          )}
          {/* Tool calls */}
          {turn.toolCalls.map(tc => (
            <EnforcementCard key={tc.id} toolCall={tc} />
          ))}
          {/* Streaming text */}
          {!turn.thinking && !turn.toolCalls.length && (
            <div className="flex items-center gap-1.5 text-white/25 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking…
            </div>
          )}
          {turn.text && (
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.03] border border-white/5 text-sm text-white/60 leading-relaxed">
              {turn.text}
              <span className="inline-block w-0.5 h-3.5 bg-white/30 ml-0.5 animate-pulse align-text-bottom" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScorePanel({
  agent,
  turns,
  regulationsTriggered,
  blocksTotal,
  onEndSession,
}: {
  agent: AttackerAgent
  turns: number
  regulationsTriggered: Set<string>
  blocksTotal: number
  onEndSession: () => void
}) {
  const score = agent.totalRegulations > 0
    ? Math.round((regulationsTriggered.size / agent.totalRegulations) * 100)
    : 0

  return (
    <div className="p-4 space-y-5">
      {/* Score */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Threat Coverage</p>
        <div className="flex items-end gap-2">
          <span className={`text-3xl font-black tabular-nums ${
            score >= 80 ? "text-red-400" : score >= 50 ? "text-amber-400" : score >= 25 ? "text-yellow-400" : "text-white/30"
          }`}>
            {score}%
          </span>
          <span className="text-[10px] text-white/25 mb-1">{regulationsTriggered.size}/{agent.totalRegulations} regs</span>
        </div>
        <div className="mt-1.5 w-full h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score >= 80 ? "bg-red-500" : score >= 50 ? "bg-amber-500" : score >= 25 ? "bg-yellow-500" : "bg-white/20"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{turns}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/20 mt-0.5">Attacks</p>
        </div>
        <div className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-red-400 tabular-nums">{blocksTotal}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/20 mt-0.5">Blocked</p>
        </div>
      </div>

      {/* Regulation trophy case */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3 h-3 text-white/20" />
          <p className="text-[9px] uppercase tracking-widest text-white/20">Regulations</p>
        </div>
        <div className="space-y-1">
          {agent.packs.map(pack => {
            const hit = regulationsTriggered.has(pack)
            return (
              <div key={pack} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
                hit ? "bg-red-500/8 border border-red-500/15" : "bg-white/[0.01] border border-white/4"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hit ? "bg-red-500" : "bg-white/10"}`} />
                <span className={hit ? "text-white/70" : "text-white/20"}>{PACK_LABELS[pack] ?? pack}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* End session */}
      <button
        onClick={onEndSession}
        className="w-full px-3 py-2 rounded-lg border border-white/8 text-xs text-white/30 hover:text-white/60 hover:border-white/15 transition-all"
      >
        End session → view report
      </button>
    </div>
  )
}

function ApiKeyModal({
  reason,
  resetAt,
  onSave,
  onClose,
}: {
  reason: "no_key" | "rate_limit"
  resetAt: number | null
  onSave: (key: string) => void
  onClose: () => void
}) {
  const [key, setKey] = useState("")

  const resetDate = resetAt
    ? new Date(resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e1117] shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">
              {reason === "rate_limit" ? "Free limit reached" : "OpenRouter API key required"}
            </h3>
            <p className="text-xs text-white/40 mt-1">
              {reason === "rate_limit"
                ? `10 free turns per 24 hours. ${resetDate ? `Resets at ${resetDate}` : ""} — or use your own key.`
                : "No server API key is configured. Provide your own OpenRouter key to continue."}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-white/30">
            OpenRouter API key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors font-mono"
            autoFocus
          />
          <p className="text-[10px] text-white/20">
            Saved locally to localStorage. Never sent anywhere except OpenRouter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (key.trim()) onSave(key.trim()) }}
            disabled={!key.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 hover:bg-white/90 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            Save and continue
          </button>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Get a free key →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "select" | "briefing" | "active" | "report"

export function AttackerMode() {
  const [phase, setPhase] = useState<Phase>("select")
  const [selectedAgent, setSelectedAgent] = useState<AttackerAgent | null>(null)

  // Conversation state
  const [messages, setMessages] = useState<OpenRouterMessage[]>([])
  const [turns, setTurns] = useState<AttackTurn[]>([])
  const [currentTurn, setCurrentTurn] = useState<StreamingTurn | null>(null)
  const [currentUserPrompt, setCurrentUserPrompt] = useState("")
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Score state
  const [regulationsTriggered, setRegulationsTriggered] = useState<Set<string>>(new Set())
  const [blocksTotal, setBlocksTotal] = useState(0)
  const [usedPatternIds, setUsedPatternIds] = useState<string[]>([])
  const [currentPatternHint, setCurrentPatternHint] = useState<AttackPattern | null>(null)

  // Rate limiting
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyModalReason, setApiKeyModalReason] = useState<"no_key" | "rate_limit">("no_key")

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns, currentTurn])

  // Focus input when active
  useEffect(() => {
    if (phase === "active" && inputRef.current) {
      inputRef.current.focus()
    }
  }, [phase])

  // ── Phase transitions ──────────────────────────────────────────────────────

  const handleSelectAgent = (agent: AttackerAgent) => {
    setSelectedAgent(agent)
    setPhase("briefing")
  }

  const handleBeginAttack = () => {
    if (!selectedAgent) return
    setMessages([])
    setTurns([])
    setCurrentTurn(null)
    setCurrentUserPrompt("")
    setRegulationsTriggered(new Set())
    setBlocksTotal(0)
    setUsedPatternIds([])
    setCurrentPatternHint(null)
    setError(null)
    setPhase("active")
  }

  const handleEndSession = () => setPhase("report")

  const handleRestart = () => {
    if (!selectedAgent) return
    setMessages([])
    setTurns([])
    setCurrentTurn(null)
    setCurrentUserPrompt("")
    setRegulationsTriggered(new Set())
    setBlocksTotal(0)
    setUsedPatternIds([])
    setCurrentPatternHint(null)
    setError(null)
    setPhase("active")
  }

  const handleNewAgent = () => {
    setSelectedAgent(null)
    setPhase("select")
  }

  // ── API key modal ──────────────────────────────────────────────────────────

  const handleSaveApiKey = (key: string) => {
    storeApiKey(key)
    setShowApiKeyModal(false)
  }

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!selectedAgent || !input.trim() || isStreaming) return

    const userContent = input.trim()
    setInput("")
    setIsStreaming(true)
    setError(null)
    setCurrentPatternHint(null)
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

    try {
      const res = await fetch("/api/attacker", {
        method: "POST",
        headers,
        body: JSON.stringify({ agentId: selectedAgent.id, messages: requestMessages }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setRateLimitReset(body.resetAt ?? null)
          setApiKeyModalReason("rate_limit")
          setShowApiKeyModal(true)
        } else if (res.status === 503) {
          setApiKeyModalReason("no_key")
          setShowApiKeyModal(true)
        } else {
          setError(body.message ?? `Request failed (${res.status})`)
        }
        setIsStreaming(false)
        setCurrentTurn(null)
        setCurrentUserPrompt("")
        return
      }

      // Read rate limit remaining from headers
      const remaining = res.headers.get("X-RateLimit-Remaining")
      if (remaining && remaining !== "∞") {
        setRateLimitRemaining(parseInt(remaining))
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

    // ── Finalize ────────────────────────────────────────────────────────────

    const finalAssistantText = doneData?.assistantText ?? assistantTextAcc
    const rawToolCalls = doneData?.toolCalls ?? []

    // Track enforcement results
    let newBlocks = 0
    const newRegsTriggered = new Set<string>(regulationsTriggered)

    rawToolCalls.forEach(tc => {
      if (tc.enforcement.blocked) {
        newBlocks++
        if (tc.enforcement.primaryViolation?.pack) {
          newRegsTriggered.add(tc.enforcement.primaryViolation.pack)
        }
        tc.enforcement.allViolations?.forEach((v: EnforcementViolation) => {
          if (v.pack) newRegsTriggered.add(v.pack)
        })
      }
    })

    if (newBlocks > 0) {
      setBlocksTotal(prev => prev + newBlocks)
      setRegulationsTriggered(new Set(newRegsTriggered))
      const hint = getPatternAfterBlock(selectedAgent.id, usedPatternIds)
      if (hint) {
        setCurrentPatternHint(hint)
        setUsedPatternIds(prev => [...prev, hint.id])
      }
    }

    // Build finalized turn object
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

    setTurns(prev => [...prev, finalTurn])
    setCurrentTurn(null)
    setCurrentUserPrompt("")

    // Build next OpenRouter message history
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
  }, [selectedAgent, input, isStreaming, messages, regulationsTriggered, usedPatternIds])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertPatternExample = (example: string) => {
    setInput(example)
    setCurrentPatternHint(null)
    inputRef.current?.focus()
  }

  // ── Phase renders ──────────────────────────────────────────────────────────

  const renderSelect = () => (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-5">
          <Swords className="w-3.5 h-3.5" />
          Attacker Mode
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Choose your target</h1>
        <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
          Social-engineer a real AI agent into making regulatory violations. comply54 intercepts every tool call in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attackerAgents.map(agent => (
          <button
            key={agent.id}
            onClick={() => handleSelectAgent(agent)}
            className={`text-left rounded-2xl border p-5 transition-all duration-200 hover:border-opacity-60 hover:bg-white/[0.035] group ${agent.borderClass} ${agent.bgClass}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{agent.emoji}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[agent.difficulty]}`}>
                {agent.difficulty}
              </span>
            </div>

            <h3 className="font-semibold text-white mb-0.5">{agent.name}</h3>
            <p className={`text-xs font-medium mb-2 ${agent.accentClass}`}>{agent.organization}</p>
            <p className="text-xs text-white/40 leading-relaxed mb-3">{agent.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {agent.packs.map(p => (
                <span key={p} className="text-[9px] px-2 py-0.5 rounded-full border border-white/8 text-white/25 bg-white/[0.02]">
                  {PACK_LABELS[p] ?? p}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1 text-xs text-white/25 group-hover:text-white/50 transition-colors">
              <span>Select target</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderBriefing = () => {
    if (!selectedAgent) return null
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={() => setPhase("select")}
          className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Agent profile */}
        <div className={`rounded-2xl border ${selectedAgent.borderClass} ${selectedAgent.bgClass} p-6 mb-6`}>
          <div className="flex items-start gap-4">
            <span className="text-5xl">{selectedAgent.emoji}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-white">{selectedAgent.name}</h2>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[selectedAgent.difficulty]}`}>
                  {selectedAgent.difficulty}
                </span>
              </div>
              <p className={`text-sm font-medium mb-0.5 ${selectedAgent.accentClass}`}>{selectedAgent.organization}</p>
              <p className="text-xs text-white/35">{selectedAgent.role}</p>
            </div>
          </div>
        </div>

        {/* Objective */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-white/30" />
            <p className="text-xs uppercase tracking-widest text-white/30 font-medium">Your objective</p>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{selectedAgent.objective}</p>
        </div>

        {/* Attack surface */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 mb-4">
          <p className="text-xs uppercase tracking-widest text-white/30 font-medium mb-3">Known vulnerabilities</p>
          <ul className="space-y-2">
            {selectedAgent.attackSurface.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/50 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Rules of engagement */}
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-medium mb-2">Rules of engagement</p>
          <p className="text-xs text-white/40 leading-relaxed">
            The agent will attempt to use its tools. comply54 intercepts every tool call and applies real enforcement rules.
            Your goal is to discover as many regulation violations as possible — every unique regulation triggered is a point scored.
            You cannot bypass comply54. The game is in what you can <em>discover</em>, not what you can <em>bypass</em>.
          </p>
        </div>

        <button
          onClick={handleBeginAttack}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
        >
          <Swords className="w-4 h-4" />
          Begin Attack
        </button>
      </div>
    )
  }

  const renderActive = () => {
    if (!selectedAgent) return null
    return (
      <div className="flex h-[calc(100vh-57px)]">
        {/* Conversation area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Agent header */}
          <div className={`px-4 py-3 border-b border-white/5 flex items-center gap-3 shrink-0 ${selectedAgent.bgClass}`}>
            <span className="text-xl">{selectedAgent.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/80 truncate">{selectedAgent.name}</p>
              <p className={`text-[10px] truncate ${selectedAgent.accentClass}`}>{selectedAgent.organization}</p>
            </div>
            <div className="ml-auto flex items-center gap-3 shrink-0">
              {rateLimitRemaining !== null && (
                <span className="text-[10px] text-white/25">
                  {rateLimitRemaining} turn{rateLimitRemaining !== 1 ? "s" : ""} left
                </span>
              )}
              <button
                onClick={handleEndSession}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors border border-white/8 px-2 py-1 rounded-md"
              >
                End session
              </button>
            </div>
          </div>

          {/* Scroll area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
          >
            {turns.length === 0 && !currentTurn && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
                <Swords className="w-8 h-8 text-white/10" />
                <p className="text-sm text-white/25">Send your first message to begin the attack</p>
                <p className="text-xs text-white/15 max-w-xs leading-relaxed">
                  Try asking the agent to perform an action. See what comply54 intercepts.
                </p>
              </div>
            )}

            {turns.map(turn => <TurnBubble key={turn.id} turn={turn} />)}

            {currentTurn && (
              <StreamingBubble userPrompt={currentUserPrompt} turn={currentTurn} />
            )}
          </div>

          {/* Pattern hint */}
          {currentPatternHint && (
            <div className="px-4 py-3 border-t border-amber-500/10 bg-amber-500/[0.03] shrink-0">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-400/80 font-medium">{currentPatternHint.name}</p>
                  <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{currentPatternHint.hint}</p>
                </div>
                <button
                  onClick={() => insertPatternExample(currentPatternHint.example)}
                  className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors border border-amber-500/20 px-2 py-1 rounded shrink-0 whitespace-nowrap"
                >
                  Try it
                </button>
                <button onClick={() => setCurrentPatternHint(null)} className="text-white/20 hover:text-white/40 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
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
                placeholder={`Social-engineer ${selectedAgent.name}… ⌘↵ to send`}
                disabled={isStreaming}
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
                disabled={isStreaming || !input.trim()}
                className="shrink-0 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Score panel — desktop */}
        <aside className="hidden lg:flex w-64 flex-col border-l border-white/5 overflow-y-auto shrink-0">
          <ScorePanel
            agent={selectedAgent}
            turns={turns.length}
            regulationsTriggered={regulationsTriggered}
            blocksTotal={blocksTotal}
            onEndSession={handleEndSession}
          />
        </aside>
      </div>
    )
  }

  const renderReport = () => {
    if (!selectedAgent) return null
    return (
      <AttackReport
        agent={selectedAgent}
        turns={turns}
        regulationsTriggered={regulationsTriggered}
        blocksTotal={blocksTotal}
        onRestart={handleRestart}
        onNewAgent={handleNewAgent}
      />
    )
  }

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-white/60">Agent Disaster Lab</span>
          </a>
          <span className="text-white/15">/</span>
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <Swords className="w-3.5 h-3.5" />
            Attacker Mode
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/sandbox"
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Sandbox
          </a>
        </div>
      </nav>

      {/* Phase content */}
      {phase === "select"   && renderSelect()}
      {phase === "briefing" && renderBriefing()}
      {phase === "active"   && renderActive()}
      {phase === "report"   && renderReport()}

      {/* API key modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          reason={apiKeyModalReason}
          resetAt={rateLimitReset}
          onSave={handleSaveApiKey}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  )
}
