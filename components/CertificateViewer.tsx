"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Copy, Check, KeyRound, ChevronDown, ChevronUp, Fingerprint, AlertTriangle } from "lucide-react"
import { verifyReceipt } from "@comply54/core"
import type { ReceiptPayload } from "@comply54/core"
import { DEMO_PUBLIC_KEY } from "@/lib/receipt-demo"
import type { EnforcementResult } from "@/lib/types"

interface Props {
  enforcement: EnforcementResult
}

type VerifyState = "idle" | "verifying" | "valid" | "invalid"

export function CertificateViewer({ enforcement }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState>("idle")
  const [payload, setPayload] = useState<ReceiptPayload | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const token = enforcement.receiptToken

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
      const p = await verifyReceipt(token, DEMO_PUBLIC_KEY)
      setPayload(p)
      setVerifyState("valid")
      setExpanded(true)
    } catch (e) {
      setVerifyError(String(e))
      setVerifyState("invalid")
    }
  }

  if (!token) return null

  // Show just the first + last 24 chars with … in the middle
  const truncated = `${token.slice(0, 36)}…${token.slice(-24)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 rounded-lg border border-green-500/20 bg-[#060d09] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-500/10 bg-green-950/15">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[11px] font-mono text-green-400/80 uppercase tracking-wider">
            comply54 signed receipt · Ed25519 JWT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "copied" : "copy"}
          </button>
        </div>
      </div>

      {/* Token display */}
      <div className="px-4 py-3 font-mono text-[11px] text-white/35 break-all leading-relaxed">
        {truncated}
      </div>

      {/* Verify bar */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={verifyState === "verifying"}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded transition-all ${
            verifyState === "idle"
              ? "bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20"
              : verifyState === "verifying"
              ? "bg-green-500/5 border border-green-500/10 text-green-400/40 cursor-wait"
              : verifyState === "valid"
              ? "bg-green-500/20 border border-green-500/40 text-green-300"
              : "bg-red-500/10 border border-red-500/25 text-red-400"
          }`}
        >
          <KeyRound className="w-3 h-3" />
          {verifyState === "idle" && "Verify receipt →"}
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
            {expanded ? "hide payload" : "show payload"}
          </button>
        )}
      </div>

      {/* Verification error */}
      <AnimatePresence>
        {verifyState === "invalid" && verifyError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-3 p-3 rounded border border-red-500/20 bg-red-950/15"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-mono text-red-400/80">{verifyError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decoded payload */}
      <AnimatePresence>
        {verifyState === "valid" && payload && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-green-500/10"
          >
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">
                  Verified payload
                </span>
              </div>
              {[
                { label: "issuer", value: payload.issuer },
                { label: "decision", value: payload.decision.toUpperCase(), highlight: payload.decision !== "allow" },
                { label: "pack", value: payload.pack ?? "—" },
                { label: "rule", value: payload.ruleTriggered ?? "—" },
                { label: "input_digest", value: payload.inputDigest },
                { label: "comply54_version", value: payload.comply54Version },
                { label: "jti", value: payload.jti },
                {
                  label: "issued_at",
                  value: new Date(payload.issuedAt * 1000).toISOString(),
                },
                {
                  label: "packs_evaluated",
                  value: `[${payload.packsEvaluated.length} packs]`,
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex gap-2 font-mono text-[10.5px]">
                  <span className="text-white/25 w-36 flex-shrink-0">{label}</span>
                  <span className={highlight ? "text-red-300" : "text-green-300/70"}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
