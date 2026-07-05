"use client"

import { motion } from "framer-motion"
import { X, AlertTriangle, BookOpen, Scale, Building2 } from "lucide-react"
import type { RegulationSpotlight as RegulationSpotlightType } from "@/lib/types"
import type { EnforcementResult } from "@/lib/types"

interface Props {
  spotlight: RegulationSpotlightType
  enforcement: EnforcementResult | null
  onClose: () => void
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-500/30",
    bg: "bg-red-950/40",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: "text-red-500",
  },
  high: {
    border: "border-orange-500/30",
    bg: "bg-orange-950/30",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: "text-orange-500",
  },
  medium: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-950/20",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: "text-yellow-500",
  },
}

export function RegulationSpotlight({ spotlight, enforcement, onClose }: Props) {
  const styles = SEVERITY_STYLES[spotlight.severity]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0c0e14] border-l border-white/10 z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${styles.icon} shrink-0`} />
              <div>
                <div className={`text-[10px] font-mono font-medium uppercase tracking-wider mb-1 ${styles.icon}`}>
                  {spotlight.severity} severity · comply54 blocked
                </div>
                <h2 className="font-semibold text-white leading-tight">
                  {spotlight.lawName}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Citation */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-white/30" />
              <span className="text-xs font-mono text-white/30 uppercase tracking-wider">
                Legal Citation
              </span>
            </div>
            <div className="font-mono text-sm text-white/60 bg-white/[0.03] rounded-lg px-4 py-3 border border-white/5">
              <div className="text-white/40 text-xs mb-1">{spotlight.citation}</div>
              <div className="text-white/70">{spotlight.relevantSection}</div>
            </div>
          </div>

          {/* Law text */}
          <div>
            <div className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2">
              Regulation Text
            </div>
            <blockquote className={`rounded-lg border ${styles.border} bg-white/[0.02] px-4 py-4`}>
              <p className="text-sm text-white/70 leading-relaxed italic">
                &ldquo;{spotlight.text}&rdquo;
              </p>
            </blockquote>
          </div>

          {/* Penalty */}
          <div className={`rounded-lg border ${styles.border} ${styles.bg} px-4 py-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Scale className={`w-4 h-4 ${styles.icon}`} />
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
                Maximum Penalty
              </span>
            </div>
            <p className={`text-sm font-semibold ${styles.icon}`}>
              {spotlight.maxPenalty}
            </p>
          </div>

          {/* Authority */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-white/30" />
              <span className="text-xs font-mono text-white/30 uppercase tracking-wider">
                Enforcement Authority
              </span>
            </div>
            <p className="text-sm text-white/60">{spotlight.enforcementAuthority}</p>
          </div>

          {/* comply54 enforcement details */}
          {enforcement && (
            <div className="rounded-lg border border-green-500/20 bg-green-950/10 px-4 py-4">
              <div className="text-xs font-mono text-green-400/60 uppercase tracking-wider mb-3">
                comply54 enforcement record
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-white/30">decision</span>
                  <span className="text-red-400 font-semibold uppercase">{enforcement.decision}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/30">auditId</span>
                  <span className="text-white/50 truncate">{enforcement.auditId}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/30">evaluatedAt</span>
                  <span className="text-white/50">{new Date(enforcement.evaluatedAt).toLocaleTimeString()}</span>
                </div>
                {enforcement.primaryViolation && (
                  <>
                    <div className="pt-1 border-t border-white/5" />
                    <div className="flex justify-between gap-2">
                      <span className="text-white/30">pack</span>
                      <span className="text-white/50 truncate">{enforcement.primaryViolation.pack}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/30">regulation</span>
                      <span className="text-white/50 truncate">{enforcement.primaryViolation.regulation}</span>
                    </div>
                    {enforcement.primaryViolation.ruleTriggered && (
                      <div className="flex justify-between gap-2">
                        <span className="text-white/30">rule</span>
                        <span className="text-white/50 truncate">{enforcement.primaryViolation.ruleTriggered}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
