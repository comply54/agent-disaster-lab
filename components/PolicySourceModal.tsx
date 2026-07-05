"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { X, ExternalLink, Loader2, AlertCircle } from "lucide-react"

interface Props {
  pack: string
  regulation: string
  onClose: () => void
}

const RAW_BASE = "https://raw.githubusercontent.com/comply54/comply54/main/comply54/packs"
const VIEW_BASE = "https://github.com/comply54/comply54/blob/main/comply54/packs"

const PACK_PATH: Record<string, string> = {
  "nigeria/cbn": "nigeria/cbn.rego",
  "nigeria/ndpa": "nigeria/ndpa.rego",
  "nigeria/bvn-nin": "nigeria/bvn_nin.rego",
  "nigeria/nfiu-aml": "nigeria/nfiu_aml.rego",
  "nigeria/nha": "nigeria/nha.rego",
  "nigeria/naicom": "nigeria/naicom.rego",
  "kenya/kdpa": "africa/kdpa.rego",
  "south-africa/popia": "africa/popia.rego",
  "ghana/dpa": "africa/ghana_dpa.rego",
  "rwanda/dpa": "africa/rwanda_dpa.rego",
  "egypt/pdpl": "africa/egypt_pdpl.rego",
  "ethiopia/pdp": "africa/ethiopia_pdp.rego",
  "mauritius/dpa": "africa/mauritius_dpa.rego",
  "tanzania/pdpa": "africa/tanzania_pdpa.rego",
  "uganda/dppa": "africa/uganda_dppa.rego",
  "universal/prompt-injection": "universal/prompt_injection.rego",
  "universal/pii-leakage": "universal/pii_leakage.rego",
  "universal/tool-permissions": "universal/tool_permissions.rego",
  "universal/human-approval": "universal/human_approval.rego",
  "universal/model-routing": "universal/model_routing.rego",
}

const KW_REGO = /^(?:package|import|deny|allow|escalate|audit|default|contains|if|else|not|in|every)$/
const KW_BUILTIN = /^(?:input|data|rego)$/
const KW_LITERAL = /^(?:true|false|null)$/

function RegoLine({ line }: { line: string }) {
  if (line.trimStart().startsWith("#")) {
    return <div className="text-green-600/55 select-text">{line || " "}</div>
  }

  const parts = line.split(
    /(\"[^\"]*\"|'[^']*'|\b\d+\b|:=|==|!=|>=|<=|\b(?:package|import|deny|allow|escalate|audit|default|contains|if|else|not|in|every|input|data|rego|true|false|null)\b)/
  )

  return (
    <div className="select-text">
      {parts.map((part, j) => {
        if (/^\"[^\"]*\"$|^'[^']*'$/.test(part))
          return <span key={j} className="text-amber-300/80">{part}</span>
        if (/^\d+$/.test(part))
          return <span key={j} className="text-cyan-400/80">{part}</span>
        if (KW_REGO.test(part))
          return <span key={j} className="text-violet-400">{part}</span>
        if (KW_BUILTIN.test(part))
          return <span key={j} className="text-blue-400/80">{part}</span>
        if (KW_LITERAL.test(part))
          return <span key={j} className="text-orange-400/80">{part}</span>
        if (/^:=|==|!=|>=|<=$/.test(part))
          return <span key={j} className="text-white/50">{part}</span>
        return <span key={j} className="text-white/60">{part}</span>
      })}
    </div>
  )
}

export function PolicySourceModal({ pack, regulation, onClose }: Props) {
  const [source, setSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const filePath = PACK_PATH[pack]
  const rawUrl = filePath ? `${RAW_BASE}/${filePath}` : null
  const githubUrl = filePath ? `${VIEW_BASE}/${filePath}` : null

  useEffect(() => {
    if (!rawUrl) { setLoading(false); setError(true); return }
    fetch(rawUrl)
      .then((r) => { if (!r.ok) throw new Error(); return r.text() })
      .then((text) => { setSource(text); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [rawUrl])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, type: "spring", damping: 28 }}
        className="relative w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0d1117] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-violet-400/80">{pack}</code>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-xs text-white/40 truncate">{regulation}</span>
            </div>
            <p className="text-[10px] text-white/20 mt-0.5">
              Rego policy evaluated against your action — via comply54
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/8 hover:border-white/15"
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-48 gap-2 text-white/25 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading policy source…
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">Could not load policy source.</p>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/50 hover:text-white/80 underline transition-colors flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {source && !loading && (
            <pre className="px-5 py-4 text-xs font-mono leading-relaxed overflow-x-auto">
              {source.split("\n").map((line, i) => (
                <RegoLine key={i} line={line} />
              ))}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 bg-white/[0.01] shrink-0">
          <p className="text-[10px] text-white/20">
            This is the exact Rego rule comply54 evaluated against your action.
            Policy packs are open-source at{" "}
            <a
              href="https://github.com/comply54/comply54"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/35 hover:text-white/60 underline transition-colors"
            >
              github.com/comply54/comply54
            </a>
            . You can fork and extend them.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
