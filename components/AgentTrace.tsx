"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Wrench, CheckCircle, ShieldX, MessageSquare, ChevronRight } from "lucide-react"
import { useTypewriter } from "@/lib/useTypewriter"
import type { TraceEntry, RunState } from "./ScenarioRunner"

interface Props {
  entries: TraceEntry[]
  runState: RunState
  mode: "safe" | "unsafe"
  onViewRegulation?: () => void
}

function TypedText({ text, speed = 16 }: { text: string; speed?: number }) {
  const typed = useTypewriter(text, speed)
  return <>{typed}</>
}

function ParamRow({ k, v }: { k: string; v: unknown }) {
  const val =
    v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v)
  return (
    <div className="flex gap-2 text-xs font-mono leading-relaxed">
      <span className="text-purple-400/80 shrink-0">{k}:</span>
      <span className="text-amber-300/80 break-all">{val}</span>
    </div>
  )
}

const ENTRY_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

function ThinkingEntry({ entry }: { entry: TraceEntry }) {
  return (
    <motion.div variants={ENTRY_VARIANTS} initial="hidden" animate="visible"
      className="flex gap-3 px-5 py-3 border-l-2 border-transparent hover:border-white/5 transition-colors">
      <Brain className="w-3.5 h-3.5 text-white/20 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-white/20 font-mono mb-1 uppercase tracking-wider">thinking</div>
        <p className="text-white/40 text-xs leading-relaxed italic">
          <TypedText text={entry.content} speed={10} />
        </p>
      </div>
    </motion.div>
  )
}

function AssistantEntry({ entry }: { entry: TraceEntry }) {
  return (
    <motion.div variants={ENTRY_VARIANTS} initial="hidden" animate="visible"
      className="flex gap-3 px-5 py-3">
      <MessageSquare className="w-3.5 h-3.5 text-white/40 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-white/20 font-mono mb-1 uppercase tracking-wider">assistant</div>
        <p className="text-white/70 text-sm leading-relaxed">
          <TypedText text={entry.content} speed={14} />
        </p>
      </div>
    </motion.div>
  )
}

function ToolCallEntry({ entry }: { entry: TraceEntry }) {
  return (
    <motion.div variants={ENTRY_VARIANTS} initial="hidden" animate="visible" className="px-5 py-2">
      <div className="rounded-lg border border-yellow-500/15 bg-yellow-950/10 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-yellow-500/10 bg-yellow-950/10">
          <Wrench className="w-3 h-3 text-yellow-500/70" />
          <span className="text-yellow-400/90 text-xs font-mono font-medium flex-1">
            {entry.toolName}
          </span>
          <ChevronRight className="w-3 h-3 text-white/15" />
          <span className="text-[10px] text-white/15 font-mono">tool_call</span>
        </div>
        {entry.params && Object.keys(entry.params).length > 0 && (
          <div className="px-3 py-2.5 space-y-1">
            {Object.entries(entry.params).map(([k, v]) => (
              <ParamRow key={k} k={k} v={v} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ToolResultEntry({ entry }: { entry: TraceEntry }) {
  const isDisaster = entry.isDisaster
  return (
    <motion.div variants={ENTRY_VARIANTS} initial="hidden" animate="visible"
      className="flex gap-3 px-5 py-3">
      <CheckCircle className={`w-3.5 h-3.5 mt-1 shrink-0 ${isDisaster ? "text-red-500" : "text-green-500/60"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-white/20 font-mono mb-1 uppercase tracking-wider">
          {entry.toolName} · result
        </div>
        <p className={`text-xs font-mono leading-relaxed ${isDisaster ? "text-red-400" : "text-white/50"}`}>
          <TypedText text={entry.content} speed={12} />
        </p>
      </div>
    </motion.div>
  )
}

function ConsequenceEntry({ entry }: { entry: TraceEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="px-5 py-3"
    >
      <motion.div
        animate={{ borderColor: ["rgba(239,68,68,0.2)", "rgba(239,68,68,0.5)", "rgba(239,68,68,0.2)"] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="rounded-lg border border-red-500/20 bg-red-950/25 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <span className="text-red-400/70 text-[10px] font-mono uppercase tracking-wider">
            consequence
          </span>
        </div>
        <p className="text-red-300 text-sm font-semibold leading-relaxed">
          <TypedText text={entry.content} speed={20} />
        </p>
      </motion.div>
    </motion.div>
  )
}

function BlockEntry({
  entry,
  onViewRegulation,
}: {
  entry: TraceEntry
  onViewRegulation?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", damping: 20 }}
      className="px-5 py-3"
    >
      <motion.div
        animate={{ borderColor: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0.5)", "rgba(34,197,94,0.2)"] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="rounded-lg border border-green-500/20 bg-green-950/15 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldX className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs font-mono font-semibold uppercase tracking-wider">
            blocked by comply54
          </span>
        </div>

        <p className="text-green-300/90 text-sm leading-relaxed mb-3">
          <TypedText text={entry.content} speed={18} />
        </p>

        {entry.enforcement?.primaryViolation && (
          <div className="space-y-1 font-mono text-[11px] border-t border-green-500/10 pt-3">
            <div className="flex gap-2">
              <span className="text-white/20 shrink-0">pack</span>
              <span className="text-white/40 truncate">{entry.enforcement.primaryViolation.pack}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/20 shrink-0">regulation</span>
              <span className="text-white/40 truncate">{entry.enforcement.primaryViolation.regulation}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/20 shrink-0">auditId</span>
              <span className="text-white/30 truncate">{entry.enforcement.auditId}</span>
            </div>
          </div>
        )}

        {onViewRegulation && (
          <button
            onClick={onViewRegulation}
            className="mt-3 text-xs text-green-400/70 hover:text-green-300 underline underline-offset-2 transition-colors"
          >
            View regulation + penalty →
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

function TraceItem({
  entry,
  mode,
  onViewRegulation,
}: {
  entry: TraceEntry
  mode: "safe" | "unsafe"
  onViewRegulation?: () => void
}) {
  switch (entry.type) {
    case "thinking":
      return <ThinkingEntry entry={entry} />
    case "assistant":
      return <AssistantEntry entry={entry} />
    case "tool_call":
      return <ToolCallEntry entry={entry} />
    case "tool_result":
      return <ToolResultEntry entry={entry} />
    case "consequence":
      return <ConsequenceEntry entry={entry} />
    case "block":
      return (
        <BlockEntry
          entry={entry}
          onViewRegulation={mode === "safe" ? onViewRegulation : undefined}
        />
      )
    default:
      return null
  }
}

export function AgentTrace({ entries, runState, mode, onViewRegulation }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries.length])

  return (
    <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-0.5">
      {runState === "idle" && entries.length === 0 && (
        <div className="flex items-center justify-center h-32 text-white/15 text-sm font-mono">
          press run to begin
        </div>
      )}

      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <TraceItem
            key={entry.id}
            entry={entry}
            mode={mode}
            onViewRegulation={onViewRegulation}
          />
        ))}
      </AnimatePresence>

      {runState === "running" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 px-5 py-2 text-white/20 text-xs font-mono"
        >
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-white/20"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
          running…
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
