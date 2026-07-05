"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Copy, Check } from "lucide-react"
import type { EnforcementResult } from "@/lib/types"

interface Props {
  enforcement: EnforcementResult
}

export function CertificateViewer({ enforcement }: Props) {
  const [copied, setCopied] = useState(false)

  const certObj = {
    comply54: "enforcement-record",
    version: "1.0",
    decision: enforcement.decision,
    blocked: enforcement.blocked,
    auditId: enforcement.auditId,
    evaluatedAt: enforcement.evaluatedAt,
    primaryViolation: enforcement.primaryViolation
      ? {
          pack: enforcement.primaryViolation.pack,
          regulation: enforcement.primaryViolation.regulation,
          jurisdiction: enforcement.primaryViolation.jurisdiction,
          messages: enforcement.primaryViolation.messages,
          citations: enforcement.primaryViolation.citations,
          ruleTriggered: enforcement.primaryViolation.ruleTriggered,
        }
      : null,
  }

  const certJson = JSON.stringify(certObj, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(certJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 rounded-lg border border-green-500/15 bg-[#0a0f0c] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-500/10 bg-green-950/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[11px] font-mono text-green-400/70 uppercase tracking-wider">
            comply54 enforcement certificate
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-[11px] font-mono text-white/40 overflow-x-auto leading-relaxed max-h-56 overflow-y-auto">
        <code>{certJson}</code>
      </pre>
    </motion.div>
  )
}
