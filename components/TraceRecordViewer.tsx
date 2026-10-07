"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, Check, KeyRound, ChevronDown, ChevronUp, FileCheck2, AlertTriangle } from "lucide-react"
import type { EnforcementResult } from "@/lib/types"

interface Props {
  enforcement: EnforcementResult
}

type VerifyState = "idle" | "verifying" | "valid" | "invalid"

const APPRAISAL_COLOR: Record<string, string> = {
  affirming: "text-green-400",
  warning: "text-amber-400",
  contraindicated: "text-red-400",
}

export function TraceRecordViewer({ enforcement }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState>("idle")
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const token = enforcement.traceToken

  const handleCopy = async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = async () => {
    if (!token) return
    setVerifyState("verifying")
    setPayload(null)
    setVerifyError(null)
    try {
      const res = await fetch("/api/verify-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? "Verification failed")
      setPayload(data.payload as Record<string, unknown>)
      setVerifyState("valid")
      setExpanded(true)
    } catch (e) {
      setVerifyError(String(e))
      setVerifyState("invalid")
    }
  }

  if (!token) return null

  const truncated = `${token.slice(0, 36)}…${token.slice(-24)}`
  const appraisal = payload?.appraisal as { status?: string } | undefined
  const policy = payload?.policy as { bundle_hash?: string } | undefined
  const c54 = payload?.comply54 as { packs_evaluated?: string[] } | undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 rounded-lg border border-violet-500/20 bg-[#09070d] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-500/10 bg-violet-950/15">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-mono text-violet-300/80 uppercase tracking-wider">
            TRACE v0.2 claim · Ed25519 JWT
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-violet-300" /> : <Copy className="w-3 h-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>

      <div className="px-4 pt-2.5 text-[10px] text-white/25 leading-relaxed">
        Same mapping as the published comply54 TRACE adapter.
      </div>

      <div className="px-4 py-2.5 font-mono text-[11px] text-white/35 break-all leading-relaxed">
        {truncated}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleVerify}
          disabled={verifyState === "verifying"}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded transition-all ${
            verifyState === "idle"
              ? "bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20"
              : verifyState === "verifying"
              ? "bg-violet-500/5 border border-violet-500/10 text-violet-300/40 cursor-wait"
              : verifyState === "valid"
              ? "bg-violet-500/20 border border-violet-500/40 text-violet-200"
              : "bg-red-500/10 border border-red-500/25 text-red-400"
          }`}
        >
          <KeyRound className="w-3 h-3" />
          {verifyState === "idle" && "Verify TRACE claim →"}
          {verifyState === "verifying" && "Verifying…"}
          {verifyState === "valid" && "✓ Signature valid"}
          {verifyState === "invalid" && "✗ Verification failed"}
        </button>

        {verifyState === "valid" && payload && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "hide claims" : "show claims"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {verifyState === "invalid" && verifyError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-3 p-3 rounded border border-red-500/20 bg-red-950/15"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] font-mono text-red-400/80">{verifyError}</p>
            </div>
          </motion.div>
        )}

        {expanded && verifyState === "valid" && payload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-3 rounded border border-violet-500/15 bg-violet-950/10 overflow-hidden"
          >
            <div className="px-3 py-2.5 space-y-1.5 font-mono text-[11px]">
              <Row k="eat_profile" v={String(payload.eat_profile ?? "")} />
              <Row k="subject" v={String(payload.subject ?? "")} />
              <Row
                k="appraisal"
                v={appraisal?.status ?? ""}
                className={APPRAISAL_COLOR[appraisal?.status ?? ""] ?? "text-white/50"}
              />
              <Row k="bundle_hash" v={policy?.bundle_hash ?? ""} />
              <Row k="packs" v={(c54?.packs_evaluated ?? []).join(", ")} />
            </div>
            <div className="px-3 pb-2.5 text-[10px] text-white/25 leading-relaxed">
              The lab&apos;s demo signing key is public, so anyone can alter this claim and sign
              it again. A successful check demonstrates the verification workflow. It does not
              establish who issued the claim, or that it is unchanged.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Row({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-violet-400/60 shrink-0">{k}:</span>
      <span className={`break-all ${className ?? "text-white/50"}`}>{v}</span>
    </div>
  )
}
