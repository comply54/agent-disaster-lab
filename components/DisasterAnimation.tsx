"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Lock, Database, FileX, Gavel, Activity, Download } from "lucide-react"
import type { ConsequenceAnimation } from "@/lib/types"

interface Props {
  animation: ConsequenceAnimation
  active: boolean
}

/* ── Account Drain ─────────────────────────────────────────────────── */
function AccountDrain({ active }: { active: boolean }) {
  const [balance, setBalance] = useState(500_000_000)
  const target = 0

  useEffect(() => {
    if (!active) return
    const start = 500_000_000
    const duration = 2800
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setBalance(Math.round(start - eased * (start - target)))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active])

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] p-4">
        <div className="text-[10px] text-white/20 font-mono mb-1">ZENITH BANK — Account Balance</div>
        <motion.div
          className={`text-2xl font-mono font-bold tabular-nums transition-colors duration-300 ${
            balance < 100_000_000 ? "text-red-500" : "text-white"
          }`}
        >
          ₦{balance.toLocaleString()}
        </motion.div>
        <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-red-600 origin-left"
            animate={{ scaleX: active ? 0 : 1 }}
            transition={{ duration: 2.8, ease: [0.4, 0, 1, 1] }}
            style={{ transformOrigin: "left" }}
          />
        </div>
      </div>
      <AnimatePresence>
        {active && balance === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <Lock className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">ACCOUNT FROZEN</div>
              <div className="text-red-400/60 text-[10px]">CBN automated monitoring — BOFIA s.35</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Data Leak ─────────────────────────────────────────────────────── */
const FAKE_RECORDS = [
  { bvn: "22***4521", name: "A. Okafor", phone: "080***7812" },
  { bvn: "22***8834", name: "C. Adeyemi", phone: "081***3341" },
  { bvn: "22***1129", name: "F. Bello", phone: "070***9981" },
  { bvn: "22***5502", name: "I. Nwachukwu", phone: "090***1245" },
  { bvn: "22***7763", name: "M. Sani", phone: "080***5578" },
]

function DataLeak({ active }: { active: boolean }) {
  const [exported, setExported] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setExported((n) => {
        if (n >= 12347) { clearInterval(interval); return n }
        return Math.min(n + Math.floor(Math.random() * 380 + 120), 12347)
      })
    }, 120)
    return () => clearInterval(interval)
  }, [active])

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] text-white/30 font-mono">customer_bvns.csv</span>
          </div>
          <motion.div
            animate={active ? { color: "#f87171" } : {}}
            className="text-[10px] font-mono text-white/20"
          >
            {exported.toLocaleString()} / 12,347
          </motion.div>
        </div>
        <div className="divide-y divide-white/5">
          {FAKE_RECORDS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={active ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.12 }}
              className="flex gap-4 px-3 py-1.5 text-[10px] font-mono"
            >
              <span className="text-red-400/70 w-20 shrink-0">{r.bvn}</span>
              <span className="text-white/40 flex-1">{r.name}</span>
              <span className="text-white/30">{r.phone}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {active && exported > 6000 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <Download className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">Uploading to AWS us-east-1</div>
              <div className="text-red-400/60 text-[10px]">s3://analytics-prod-us-east-1/bvn_export.csv</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Freeze (generic account/transaction freeze) ───────────────────── */
function FreezeAnimation({ active }: { active: boolean }) {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] overflow-hidden">
        <div className="px-3 py-2 border-b border-white/5">
          <div className="text-[10px] text-white/20 font-mono">Transaction Log</div>
        </div>
        {["TXN-20240717-5531 · ₦12,000,000 · PROCESSING", "CBN AML Monitor · FLAGGED", "NFIU Screening · HIT"].map(
          (line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={active ? { opacity: 1 } : {}}
              transition={{ delay: i * 0.5 }}
              className={`px-3 py-2 text-[11px] font-mono border-b border-white/5 ${
                i === 0 ? "text-white/40" : i === 1 ? "text-yellow-400/80" : "text-red-400"
              }`}
            >
              {line}
            </motion.div>
          )
        )}
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-3"
          >
            <Lock className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-300 text-xs font-bold tracking-widest uppercase">Emergency Freeze Order</div>
              <div className="text-red-400/60 text-[10px]">NFIU — MLPPA 2022 s.15 · Ref: NFIU-2024-FREEZE-0891</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Alert (NAICOM) ────────────────────────────────────────────────── */
const ALERTS = [
  { label: "Claim auto-approved", sub: "CLM-2024-8821 · ₦15,000,000", color: "text-yellow-400" },
  { label: "Human reviewer bypassed", sub: "No assessor assigned", color: "text-orange-400" },
  { label: "NAICOM audit finding", sub: "Market Conduct Guideline 7 breach", color: "text-red-400" },
]

function AlertStack({ active }: { active: boolean }) {
  return (
    <div className="p-4 space-y-2">
      {ALERTS.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={active ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: i * 0.6, type: "spring", damping: 20 }}
          className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.025] p-3"
        >
          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.color}`} />
          <div>
            <div className={`text-xs font-semibold ${a.color}`}>{a.label}</div>
            <div className="text-white/30 text-[10px]">{a.sub}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Discrimination Stamp ──────────────────────────────────────────── */
function DiscriminationStamp({ active }: { active: boolean }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] p-4 relative overflow-hidden">
        <div className="text-[10px] text-white/20 font-mono mb-3">Application APP-2024-3341</div>
        <div className="space-y-2 text-xs font-mono">
          {[
            ["Applicant", "Amina Bello"],
            ["Age", "34"],
            ["State of Origin", "Kano"],
            ["Religion", "Islam"],
            ["Sum Assured", "₦10,000,000"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-white/25 w-28 shrink-0">{k}</span>
              <span className="text-white/50">{v}</span>
            </div>
          ))}
        </div>
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, rotate: -15, scale: 0.6 }}
              animate={{ opacity: 1, rotate: -12, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", damping: 12 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="border-4 border-red-600 rounded px-6 py-3 bg-red-950/60">
                <div className="text-red-500 text-2xl font-black tracking-widest uppercase">
                  DENIED
                </div>
                <div className="text-red-400/60 text-[10px] text-center mt-1 font-mono">
                  religion · state of origin
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <Gavel className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">NAICOM Discrimination Finding</div>
              <div className="text-red-400/60 text-[10px]">Market Conduct Guideline 12 · Class action risk</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Autonomous Diagnosis ──────────────────────────────────────────── */
function AutonomousDiag({ active }: { active: boolean }) {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-white/20 font-mono">Patient PAT-20240716-0081</div>
          <motion.div
            animate={active ? { color: "#f87171" } : {}}
            className="text-[10px] font-mono text-white/20"
          >
            NO PHYSICIAN
          </motion.div>
        </div>
        <div className="space-y-1.5 text-[11px] font-mono">
          {[
            { label: "Diagnosis", value: "Type 2 Diabetes E11.9", warn: false },
            { label: "Prescribed", value: "Metformin 1000mg BD", warn: true },
            { label: "Physician reviewed", value: "false", warn: true },
          ].map(({ label, value, warn }) => (
            <div key={label} className="flex gap-3">
              <span className="text-white/25 w-28 shrink-0">{label}</span>
              <span className={warn ? "text-red-400" : "text-white/50"}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <Activity className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">Adverse Event — Contraindicated Medication</div>
              <div className="text-red-400/60 text-[10px]">Undetected renal impairment. MDCN inquiry opened.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── PII Harvest ───────────────────────────────────────────────────── */
function PiiHarvest({ active }: { active: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setCount((n) => {
        if (n >= 50340) { clearInterval(interval); return n }
        return Math.min(n + Math.floor(Math.random() * 1200 + 400), 50340)
      })
    }, 80)
    return () => clearInterval(interval)
  }, [active])

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] p-4">
        <div className="text-[10px] text-white/20 font-mono mb-3">Bulk Export → campaign-vendor-api.io</div>
        <div className="text-3xl font-mono font-bold text-red-400 tabular-nums mb-1">
          {count.toLocaleString()}
        </div>
        <div className="text-white/30 text-xs font-mono">records exported</div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-red-600"
            style={{ width: `${(count / 50340) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/20 mt-1">
          <span>NG: {Math.min(count, 32450).toLocaleString()}</span>
          <span>KE: {Math.max(0, count - 32450).toLocaleString()}</span>
        </div>
      </div>
      <AnimatePresence>
        {active && count > 25000 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <FileX className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">Dual-jurisdiction enforcement</div>
              <div className="text-red-400/60 text-[10px]">NDPC (Nigeria) + ODPC Kenya · 2% AGR per jurisdiction</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Record Altered (HIV disclosure) ──────────────────────────────── */
function RecordAltered({ active }: { active: boolean }) {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-white/10 bg-[#0c0e14] p-4">
        <div className="text-[10px] text-white/20 font-mono mb-3">EHR Query — Patient John Adeyemi</div>
        <div className="space-y-1.5 text-[11px] font-mono">
          {[
            { label: "Name", value: "John Adeyemi", reveal: false },
            { label: "NIN", value: "12345678901", reveal: false },
            { label: "Requestor", value: "hr_manager", reveal: false },
            { label: "Consent", value: "false", reveal: false, danger: true },
          ].map(({ label, value, danger }) => (
            <div key={label} className="flex gap-3">
              <span className="text-white/25 w-28 shrink-0">{label}</span>
              <span className={danger ? "text-red-400" : "text-white/50"}>{value}</span>
            </div>
          ))}
        </div>
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.8 }}
              className="mt-3 pt-3 border-t border-red-500/20"
            >
              <div className="flex gap-3 text-[11px] font-mono">
                <span className="text-white/25 w-28 shrink-0">HIV Status</span>
                <motion.span
                  initial={{ color: "transparent" }}
                  animate={{ color: "#f87171" }}
                  transition={{ delay: 1.2 }}
                  className="font-bold"
                >
                  POSITIVE (on ART)
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-red-400 text-xs font-semibold">HIV status sent to employer HR system</div>
              <div className="text-red-400/60 text-[10px]">NHA s.26 breach · MDCN complaint filed</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main dispatcher ───────────────────────────────────────────────── */
export function DisasterAnimation({ animation, active }: Props) {
  if (!active) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-red-500/10 mt-1"
    >
      {animation === "account-drain" && <AccountDrain active={active} />}
      {animation === "data-leak" && <DataLeak active={active} />}
      {animation === "freeze" && <FreezeAnimation active={active} />}
      {animation === "alert" && <AlertStack active={active} />}
      {animation === "record-altered" && <RecordAltered active={active} />}
      {animation === "discrimination" && <DiscriminationStamp active={active} />}
      {animation === "autonomous" && <AutonomousDiag active={active} />}
      {animation === "harvest" && <PiiHarvest active={active} />}
    </motion.div>
  )
}
