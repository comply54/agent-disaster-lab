"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Play, RotateCcw, Shield, ShieldOff, Zap, FileText, Share2, Check, FlaskConical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AgentTrace } from "@/components/AgentTrace"
import { RegulationSpotlight } from "@/components/RegulationSpotlight"
import { DisasterAnimation } from "@/components/DisasterAnimation"
import { CertificateViewer } from "@/components/CertificateViewer"
import { TraceRecordViewer } from "@/components/TraceRecordViewer"
import { ApiKeyModal } from "@/components/ApiKeyModal"
import { ScenarioCodeSnippet } from "@/components/ScenarioCodeSnippet"
import { PolicySourceModal } from "@/components/PolicySourceModal"
import {
  streamOpenRouter,
  getStoredApiKey,
  getStoredModel,
  type OpenRouterMessage,
  type OpenRouterToolCall,
} from "@/lib/openrouter"
import type { Scenario, EnforcementResult, ToolCallStep } from "@/lib/types"

interface Props {
  scenario: Scenario
}

export type RunState = "idle" | "running" | "blocked" | "disaster" | "done"
export type Mode = "demo" | "live"

export interface TraceEntry {
  id: string
  stepIndex: number
  type: "thinking" | "tool_call" | "tool_result" | "consequence" | "assistant" | "block" | "voice_call" | "voice_guard_check"
  content: string
  toolName?: string
  params?: Record<string, unknown>
  enforcement?: EnforcementResult
  isDisaster?: boolean
  /** For voice_call entries */
  speaker?: "caller" | "agent"
  /** For voice_guard_check entries */
  guardClaim?: string
  guardRule?: string
  guardChecks?: Array<{ label: string; passed: boolean }>
}

// Module-level handle so reset() and unmount cleanup can both cancel in-flight audio.
let _currentAudio: HTMLAudioElement | null = null

function cancelCurrentAudio() {
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.src = ""
    _currentAudio = null
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

async function speakAndWait(text: string, speaker: "caller" | "agent"): Promise<void> {
  // Prefer ElevenLabs via the server route (neural quality, distinct voices).
  // Falls back to browser speechSynthesis when ELEVENLABS_API_KEY is not set (503).
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      await new Promise<void>((resolve) => {
        const audio = new Audio(url)
        _currentAudio = audio
        const cleanup = () => { URL.revokeObjectURL(url); _currentAudio = null; resolve() }
        audio.onended = cleanup
        audio.onerror = cleanup
        audio.play().catch(cleanup)
      })
      return
    }
  } catch {
    // network error — fall through to browser TTS
  }

  // Fallback: browser Web Speech API (varies by OS/browser)
  if (typeof window === "undefined" || !window.speechSynthesis) return
  const u = new SpeechSynthesisUtterance(text)
  u.rate = speaker === "agent" ? 0.87 : 0.97
  u.pitch = speaker === "caller" ? 1.2 : 0.75
  u.volume = 1
  await new Promise<void>((resolve) => {
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

/** Rough estimate of how long speechSynthesis will take at the given rate (~180 wpm baseline). */
function estimateSpeechMs(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).length
  return Math.ceil((words / (180 * rate)) * 60_000)
}

const SECTOR_COLORS: Record<string, string> = {
  Fintech: "text-blue-400",
  Healthcare: "text-emerald-400",
  Insurance: "text-violet-400",
  Identity: "text-amber-400",
  Data: "text-rose-400",
}

async function runEnforce(
  toolName: string,
  params: Record<string, unknown>,
  sectorClass: string,
  action: string,
  context: Record<string, unknown>,
  output?: string,
): Promise<EnforcementResult> {
  const res = await fetch("/api/enforce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName, params, sectorClass, action, context, output }),
  })
  return res.json()
}

export function ScenarioRunner({ scenario }: Props) {
  const [mode, setMode] = useState<Mode>("demo")
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [activeMobilePane, setActiveMobilePane] = useState<"unsafe" | "safe">("unsafe")
  const [copied, setCopied] = useState(false)

  const [unsafeState, setUnsafeState] = useState<RunState>("idle")
  const [safeState, setSafeState] = useState<RunState>("idle")
  const [unsafeTrace, setUnsafeTrace] = useState<TraceEntry[]>([])
  const [safeTrace, setSafeTrace] = useState<TraceEntry[]>([])
  const [enforcement, setEnforcement] = useState<EnforcementResult | null>(null)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [policyPack, setPolicyPack] = useState<string | null>(null)
  const [policyRegulation, setPolicyRegulation] = useState("")

  // Cancel any in-flight audio when the component unmounts (user navigates away).
  useEffect(() => {
    return () => cancelCurrentAudio()
  }, [])

  const handleViewPolicySource = useCallback((pack: string) => {
    setPolicyPack(pack)
    setPolicyRegulation(enforcement?.primaryViolation?.regulation ?? "")
  }, [enforcement])

  const reset = useCallback(() => {
    cancelCurrentAudio()
    setUnsafeState("idle")
    setSafeState("idle")
    setUnsafeTrace([])
    setSafeTrace([])
    setEnforcement(null)
    setSpotlightOpen(false)
    setPolicyPack(null)
  }, [])

  /* ─── Demo Mode (pre-scripted) ──────────────────────────────────── */
  const runDemoUnsafe = useCallback(async () => {
    setUnsafeState("running")
    setUnsafeTrace([])

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i]
      await new Promise((r) => setTimeout(r, step.delayMs))

      if (step.type === "thinking") {
        setUnsafeTrace((t) => [...t, { id: `u-${i}`, stepIndex: i, type: "thinking", content: step.content }])
      } else if (step.type === "assistant") {
        setUnsafeTrace((t) => [...t, { id: `u-${i}`, stepIndex: i, type: "assistant", content: step.content }])
      } else if (step.type === "tool_call") {
        setUnsafeTrace((t) => [...t, { id: `u-${i}`, stepIndex: i, type: "tool_call", content: step.toolName, toolName: step.toolName, params: step.params }])
      } else if (step.type === "tool_result") {
        setUnsafeTrace((t) => [...t, { id: `u-${i}`, stepIndex: i, type: "tool_result", content: step.result, toolName: step.toolName, isDisaster: step.isDisaster }])
        if (step.isDisaster) setUnsafeState("disaster")
      } else if (step.type === "consequence") {
        setUnsafeTrace((t) => [...t, { id: `u-${i}`, stepIndex: i, type: "consequence", content: step.headline }])
        // For voice scenarios: open the regulation spotlight after the consequence has landed.
        // (For tool-call scenarios the safe pane opens it when it blocks.)
        const isVoiceScenario = scenario.steps.some((s) => s.type === "voice_call")
        if (isVoiceScenario) {
          await new Promise((r) => setTimeout(r, 1400))
          setSpotlightOpen(true)
        }
      } else if (step.type === "voice_call") {
        setUnsafeTrace((t) => [...t, {
          id: `u-${i}`, stepIndex: i, type: "voice_call",
          content: step.content, speaker: step.speaker, isDisaster: step.isDisaster,
        }])
        // Await the utterance so each line finishes before the next one starts —
        // both caller and agent speak, creating a real back-and-forth conversation.
        await speakAndWait(step.speakText ?? step.content, step.speaker)
        if (step.isDisaster) setUnsafeState("disaster")
      }
    }
    if (unsafeState !== "disaster") setUnsafeState("done")
  }, [scenario, unsafeState])

  const runDemoSafe = useCallback(async () => {
    setSafeState("running")
    setSafeTrace([])

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i]
      await new Promise((r) => setTimeout(r, step.delayMs))

      if (step.type === "thinking") {
        setSafeTrace((t) => [...t, { id: `s-${i}`, stepIndex: i, type: "thinking", content: step.content }])
      } else if (step.type === "assistant") {
        setSafeTrace((t) => [...t, { id: `s-${i}`, stepIndex: i, type: "assistant", content: step.content }])
      } else if (step.type === "tool_call") {
        setSafeTrace((t) => [...t, { id: `s-${i}`, stepIndex: i, type: "tool_call", content: step.toolName, toolName: step.toolName, params: step.params }])

        try {
          const toolStep = step as ToolCallStep
          const result = await runEnforce(
            toolStep.toolName, toolStep.params,
            scenario.comply54SectorClass, toolStep.comply54.action,
            toolStep.comply54.context ?? {},
            toolStep.comply54.output,
          )

          if (result.blocked) {
            setEnforcement(result)
            setSafeTrace((t) => [...t, {
              id: `s-block-${i}`, stepIndex: i, type: "block",
              content: result.primaryViolation?.messages[0] ?? "Blocked by comply54",
              enforcement: result,
            }])
            setSafeState("blocked")
            setSpotlightOpen(true)
            return
          }
        } catch { /* enforcement error — continue */ }
      } else if (step.type === "tool_result") {
        setSafeTrace((t) => [...t, { id: `s-${i}`, stepIndex: i, type: "tool_result", content: step.result, toolName: step.toolName }])
      } else if (step.type === "voice_call") {
        const guard = step.voice_guard
        const speakRate = step.speaker === "agent" ? 0.87 : 0.97
        const speechMs = estimateSpeechMs(step.speakText ?? step.content, speakRate)

        if (guard) {
          // Show the pre-TTS scanning animation (safe pane is silent — no audio collision)
          setSafeTrace((t) => [...t, {
            id: `s-guard-${i}`, stepIndex: i, type: "voice_guard_check",
            content: guard.claim,
            guardClaim: guard.claim,
            guardChecks: guard.checks,
          }])
          // Hold the animation long enough for comply54 to "scan" the speech, then enforce
          await new Promise((r) => setTimeout(r, Math.max(1600, speechMs * 0.4)))

          // Call comply54 to get a real enforcement result for the regulation spotlight
          try {
            const result = await runEnforce(
              "voice_output_guard",
              guard.comply54.context,
              scenario.comply54SectorClass,
              guard.comply54.action,
              guard.comply54.context,
            )
            setEnforcement(result)
            // Backfill the guard entry with the real enforcement result so
            // AgentTrace can show the actual policy decision (escalate/deny/…)
            // rather than a hardcoded "BLOCK".
            setSafeTrace((t) =>
              t.map((e) => e.id === `s-guard-${i}` ? { ...e, enforcement: result } : e)
            )
          } catch { /* use spotlight without enforcement detail */ }

          // Show the safe replacement — text only, no speech (left pane owns the audio)
          setSafeTrace((t) => [...t, {
            id: `s-${i}`, stepIndex: i, type: "voice_call",
            content: guard.safeContent, speaker: step.speaker,
          }])

          setSafeState("blocked")
          // Spotlight opens after the full disaster plays on the left pane (consequence step)
          return
        }
        // Caller and unguarded agent lines: show text, then wait the estimated speech
        // duration so both panes stay roughly in sync even though this pane is silent.
        setSafeTrace((t) => [...t, {
          id: `s-${i}`, stepIndex: i, type: "voice_call",
          content: step.content, speaker: step.speaker,
        }])
        await new Promise((r) => setTimeout(r, speechMs))
      }
    }
    setSafeState("done")
  }, [scenario])

  /* ─── Live Mode (OpenRouter streaming) ─────────────────────────── */
  const runLivePane = useCallback(async (
    apiKey: string,
    model: string,
    guarded: boolean,
    setTrace: React.Dispatch<React.SetStateAction<TraceEntry[]>>,
    setState: React.Dispatch<React.SetStateAction<RunState>>
  ) => {
    setState("running")
    setTrace([])

    const messages: OpenRouterMessage[] = [
      { role: "system", content: scenario.liveMode.systemPrompt },
      { role: "user", content: scenario.liveMode.userMessage },
    ]

    let stepIdx = 0
    let currentAssistantContent = ""
    // Content generated before the tool call — must be included in the assistant message
    let assistantContentBeforeTools = ""

    const flushAssistant = () => {
      if (!currentAssistantContent.trim()) return
      const content = currentAssistantContent
      setTrace((t) => [...t, { id: `live-a-${stepIdx++}`, stepIndex: stepIdx, type: "assistant", content }])
      assistantContentBeforeTools = content
      currentAssistantContent = ""
    }

    while (true) {
      assistantContentBeforeTools = ""
      const stream = streamOpenRouter(apiKey, model, messages, scenario.liveMode.tools)
      const toolCallsThisRound: OpenRouterToolCall[] = []
      let gotToolCall = false

      for await (const event of stream) {
        if (event.type === "error") {
          // Extract the innermost error message from the raw JSON blob
          let displayMsg = event.message
          try {
            const outer = JSON.parse(event.message.replace(/^OpenRouter error \d+: /, ""))
            const raw = outer?.error?.metadata?.raw
            displayMsg = raw
              ? (JSON.parse(raw)?.error?.message ?? displayMsg)
              : (outer?.error?.message ?? displayMsg)
          } catch { /* use raw message */ }
          setTrace((t) => [...t, { id: `live-err-${stepIdx++}`, stepIndex: stepIdx, type: "consequence", content: `Error: ${displayMsg}` }])
          setState("done")
          return
        }

        if (event.type === "delta") {
          currentAssistantContent += event.content
        }

        if (event.type === "tool_call") {
          flushAssistant()
          gotToolCall = true
          toolCallsThisRound.push(event.toolCall)

          let params: Record<string, unknown> = {}
          try { params = JSON.parse(event.toolCall.function.arguments) } catch { /* ignore */ }

          setTrace((t) => [...t, {
            id: `live-tc-${stepIdx++}`, stepIndex: stepIdx, type: "tool_call",
            content: event.toolCall.function.name,
            toolName: event.toolCall.function.name,
            params,
          }])

          if (guarded) {
            // Find matching tool comply54 context from scenario steps
            const matchingStep = scenario.steps.find(
              (s) => s.type === "tool_call" && (s as ToolCallStep).toolName === event.toolCall.function.name
            ) as ToolCallStep | undefined

            try {
              const result = await runEnforce(
                event.toolCall.function.name,
                params,
                scenario.comply54SectorClass,
                matchingStep?.comply54.action ?? event.toolCall.function.name,
                matchingStep?.comply54.context ?? {}
              )

              if (result.blocked) {
                setEnforcement(result)
                setTrace((t) => [...t, {
                  id: `live-block-${stepIdx++}`, stepIndex: stepIdx, type: "block",
                  content: result.primaryViolation?.messages[0] ?? "Blocked by comply54",
                  enforcement: result,
                }])
                setState("blocked")
                setSpotlightOpen(true)
                return
              }
            } catch { /* continue */ }
          }
        }

        if (event.type === "done") break
      }

      flushAssistant()

      if (!gotToolCall) {
        setState("done")
        return
      }

      // Build ONE assistant message combining content + tool_calls (OpenAI requirement)
      const assistantMsg: OpenRouterMessage = {
        role: "assistant",
        content: assistantContentBeforeTools || null,
        tool_calls: toolCallsThisRound,
      }
      messages.push(assistantMsg)

      for (const tc of toolCallsThisRound) {
        const toolResult = guarded
          ? "Tool executed successfully."
          : `EXECUTED: ${tc.function.name} completed. Transaction processed. Reference: TXN-${Date.now()}.`

        if (!guarded) {
          setTrace((t) => [...t, {
            id: `live-tr-${stepIdx++}`, stepIndex: stepIdx, type: "tool_result",
            content: toolResult, toolName: tc.function.name, isDisaster: true,
          }])
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        })
      }

      // Unsafe pane: disaster shown — don't send another API request
      if (!guarded) {
        setState("disaster")
        return
      }
    }
  }, [scenario])

  /* ─── Run handlers ──────────────────────────────────────────────── */
  const handleRunDemo = useCallback(() => {
    reset()
    setTimeout(() => {
      runDemoUnsafe()
      runDemoSafe()
    }, 50)
  }, [reset, runDemoUnsafe, runDemoSafe])

  const handleRunLive = useCallback((apiKey: string, model: string) => {
    reset()
    setTimeout(() => {
      // Unsafe pane: no guarding
      runLivePane(apiKey, model, false, setUnsafeTrace, setUnsafeState)
      // Safe pane: with comply54
      runLivePane(apiKey, model, true, setSafeTrace, setSafeState)
    }, 50)
  }, [reset, runLivePane])

  const handleRun = useCallback(() => {
    if (mode === "demo") {
      handleRunDemo()
    } else {
      const key = getStoredApiKey()
      const mdl = getStoredModel()
      if (!key) {
        setShowKeyModal(true)
      } else {
        handleRunLive(key, mdl)
      }
    }
  }, [mode, handleRunDemo, handleRunLive])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const isRunning = unsafeState === "running" || safeState === "running"
  const hasStarted = unsafeState !== "idle" || safeState !== "idle"

  return (
    <div className="min-h-screen bg-[#080a0f] text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
        <Link href="/" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">All scenarios</span>
        </Link>
        <div className="w-px h-4 bg-white/10 shrink-0" />
        <span className={`text-sm font-medium shrink-0 ${SECTOR_COLORS[scenario.sector] ?? "text-white/60"}`}>
          {scenario.sector}
        </span>
        <span className="text-white/20 text-sm shrink-0">/</span>
        <span className="text-sm text-white/60 truncate min-w-0">{scenario.name}</span>
        <Link
          href="/sandbox"
          className="ml-auto flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors shrink-0"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sandbox</span>
        </Link>
      </nav>

      {/* Scenario header */}
      <div className="px-4 sm:px-6 pt-5 pb-4 sm:pt-6 sm:pb-5 border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1">{scenario.name}</h1>
              <p className="text-white/40 text-sm">{scenario.teaser}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                <button
                  onClick={() => setMode("demo")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    mode === "demo"
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Demo
                </button>
                <button
                  onClick={() => setMode("live")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-l border-white/10 ${
                    mode === "live"
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Live
                  {mode === "live" && getStoredApiKey() && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </button>
              </div>

              {mode === "live" && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1"
                >
                  {getStoredApiKey() ? "Change key" : "Set API key"}
                </button>
              )}

              {hasStarted && (
                <button
                  onClick={reset}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-all text-sm disabled:opacity-30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-all text-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share"}
              </button>

              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunning ? "Running…" : hasStarted ? "Run again" : "Run scenario"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs text-white/30 border-white/10">
              {scenario.regulation}
            </Badge>
            <Badge variant="outline" className="text-xs text-white/30 border-white/10">
              {scenario.authority}
            </Badge>
            {mode === "live" && (
              <Badge variant="outline" className="text-xs text-amber-400/60 border-amber-500/20 bg-amber-500/5">
                Real LLM · {getStoredModel().split("/").pop()}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Mobile pane toggle — hidden on desktop */}
      <div className="lg:hidden flex border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveMobilePane("unsafe")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition-colors ${
            activeMobilePane === "unsafe" ? "bg-red-950/30 text-red-400" : "text-white/30 hover:text-white/50"
          }`}
        >
          <ShieldOff className="w-3.5 h-3.5" />
          Without comply54
        </button>
        <button
          onClick={() => setActiveMobilePane("safe")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border-l border-white/5 transition-colors ${
            activeMobilePane === "safe" ? "bg-green-950/30 text-green-400" : "text-white/30 hover:text-white/50"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Protected by comply54
        </button>
      </div>

      {/* Dual pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/5 overflow-hidden">
        {/* Left — No Guard */}
        <div className={`flex flex-col overflow-hidden ${activeMobilePane !== "unsafe" ? "hidden lg:flex" : ""}`}>
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-red-950/20 shrink-0">
            <ShieldOff className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-400">Without comply54</span>
            {(unsafeState === "disaster" || unsafeState === "done") && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="ml-auto">
                <Badge className="bg-red-600 text-white text-[10px] animate-pulse">DISASTER</Badge>
              </motion.div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentTrace entries={unsafeTrace} runState={unsafeState} mode="unsafe" />
            <DisasterAnimation
              animation={scenario.disasterConsequence.animation}
              active={unsafeState === "disaster" || unsafeState === "done"}
            />
          </div>
        </div>

        {/* Right — With comply54 */}
        <div className={`flex flex-col overflow-hidden ${activeMobilePane !== "safe" ? "hidden lg:flex" : ""}`}>
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-green-950/20 shrink-0">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-400">Protected by comply54</span>
            <span className="text-[10px] text-green-600/60 font-mono border border-green-800/30 rounded px-1.5 py-0.5 bg-green-950/30">
              ⚡ real enforcement
            </span>
            {safeState === "blocked" && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="ml-auto">
                <Badge className="bg-green-700 text-white text-[10px]">BLOCKED</Badge>
              </motion.div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentTrace
              entries={safeTrace}
              runState={safeState}
              mode="safe"
              onViewRegulation={() => setSpotlightOpen(true)}
              onViewPolicySource={handleViewPolicySource}
            />
            {enforcement && safeState === "blocked" && (
              <>
                <CertificateViewer enforcement={enforcement} />
                <TraceRecordViewer enforcement={enforcement} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Code snippet — revealed after run completes */}
      <AnimatePresence>
        {hasStarted && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ScenarioCodeSnippet scenario={scenario} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regulation Spotlight drawer */}
      <AnimatePresence>
        {spotlightOpen && (
          <RegulationSpotlight
            spotlight={scenario.regulationSpotlight}
            enforcement={enforcement}
            onClose={() => setSpotlightOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Policy source modal */}
      <AnimatePresence>
        {policyPack && (
          <PolicySourceModal
            pack={policyPack}
            regulation={policyRegulation}
            onClose={() => setPolicyPack(null)}
          />
        )}
      </AnimatePresence>

      {/* API Key modal */}
      <AnimatePresence>
        {showKeyModal && (
          <ApiKeyModal
            onClose={() => setShowKeyModal(false)}
            onConfirm={handleRunLive}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
