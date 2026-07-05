"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Shield, Zap, AlertTriangle, Star, ExternalLink, ArrowRight, FlaskConical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { scenarios } from "@/lib/scenarios"
import type { Sector } from "@/lib/types"

const SECTOR_COLORS: Record<Sector, string> = {
  Fintech: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Healthcare: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Insurance: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Identity: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Data: "bg-rose-500/10 text-rose-400 border-rose-500/20",
}

const SEVERITY_COLORS = {
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
}

const FRAMEWORKS = [
  { label: "LangChain", href: "https://comply54.io/docs/adapters/langchain" },
  { label: "LangGraph", href: "https://comply54.io/docs/adapters/langchain" },
  { label: "OpenAI Agents SDK", href: "https://comply54.io/docs/adapters/openai-agents" },
  { label: "OPA / Rego", href: "https://comply54.io/docs/policies" },
  { label: "AGT", href: "https://comply54.io/docs/adapters/agt" },
]

const TS_SNIPPET = `import { NigeriaFintechCompliance } from "@comply54/core"

const compliance = new NigeriaFintechCompliance()

const result = compliance.check(
  "transfer_funds",
  { amount: 500_000_000, currency: "NGN" },
  "",
  { kyc_tier: 1 }
)

if (result.blocked) {
  throw new Error(result.decisions[0].messages[0])
}
// ⛔ "CBN NIP Framework: Transaction of ₦500000000
//     exceeds ₦10,000,000 single-transaction cap"`

const PY_SNIPPET = `from comply54 import NigeriaFintechCompliance

compliance = NigeriaFintechCompliance()

result = compliance.check(
    "transfer_funds",
    {"amount": 500_000_000, "currency": "NGN"},
    "",
    {"kyc_tier": 1},
)

if result.blocked:
    raise Exception(result.decisions[0].messages[0])
# ⛔ "CBN NIP Framework: Transaction of ₦500000000
#     exceeds ₦10,000,000 single-transaction cap"`

function CodeSnippet() {
  const [lang, setLang] = useState<"ts" | "py">("ts")
  const code = lang === "ts" ? TS_SNIPPET : PY_SNIPPET

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/5">
        <button
          onClick={() => setLang("ts")}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
            lang === "ts" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
          }`}
        >
          TypeScript
        </button>
        <button
          onClick={() => setLang("py")}
          className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
            lang === "py" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
          }`}
        >
          Python
        </button>
        <span className="ml-auto text-[11px] text-white/20">
          5-line integration — works with any agent framework
        </span>
      </div>

      {/* Code block */}
      <pre className="px-6 py-5 text-xs font-mono leading-relaxed overflow-x-auto text-white/70 whitespace-pre">
        {code.split("\n").map((line, i) => {
          // Comment lines
          if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
            return <div key={i} className="text-green-500/60">{line}</div>
          }
          // Block line highlight — if/raise/throw
          if (/^\s*(if |raise |throw )/.test(line)) {
            return (
              <div key={i}>
                {line.split(/\b(if|raise|throw|new|from|import|const|result)\b/).map((part, j) =>
                  /^(if|raise|throw|new|from|import|const|result)$/.test(part)
                    ? <span key={j} className="text-violet-400">{part}</span>
                    : <span key={j}>{part}</span>
                )}
              </div>
            )
          }
          // Import / declaration lines
          return (
            <div key={i}>
              {line.split(/\b(import|from|const|new|if|throw|raise|result)\b/).map((part, j) =>
                /^(import|from|const|new|if|throw|raise|result)$/.test(part)
                  ? <span key={j} className="text-violet-400">{part}</span>
                  : part.includes('"') || part.includes("'")
                    ? <span key={j} className="text-amber-300/80">{part}</span>
                    : <span key={j}>{part}</span>
              )}
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function ArchDiagram() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <p className="text-sm font-medium text-white/80">How comply54 works</p>
        <p className="text-xs text-white/35 mt-0.5">
          Policy evaluation happens before the tool executes — not after
        </p>
      </div>

      <div className="px-8 py-8 flex flex-col items-center">
        {/* User message */}
        <div className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/60 font-medium w-full max-w-xs text-center">
          User message
        </div>
        <div className="text-white/15 text-lg leading-none my-2">↓</div>

        {/* AI Agent */}
        <div className="px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/60 font-medium w-full max-w-xs text-center">
          AI Agent
          <span className="text-white/30 text-xs font-normal block mt-0.5">
            decides to call a tool
          </span>
        </div>

        {/* Arrow with label */}
        <div className="flex flex-col items-center my-2 gap-0.5">
          <span className="text-[10px] text-white/20 tracking-wide uppercase">before execution</span>
          <div className="text-white/15 text-lg leading-none">↓</div>
        </div>

        {/* comply54 */}
        <div className="px-5 py-3 rounded-xl border border-red-500/25 bg-red-500/5 text-sm text-red-300 font-semibold w-full max-w-xs text-center font-mono">
          comply54.check(action, params)
        </div>

        {/* Branch */}
        <div className="w-full max-w-xs mt-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="text-white/15 text-lg leading-none">↓</div>
            <div className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400 font-bold w-full text-center tracking-wide">
              DENY
            </div>
            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              Tool call blocked<br />
              Violation cited<br />
              Agent informed
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-white/15 text-lg leading-none">↓</div>
            <div className="px-4 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-xs text-green-400 font-bold w-full text-center tracking-wide">
              ALLOW
            </div>
            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              Tool executes<br />
              Audit record<br />
              logged
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <span className="font-semibold tracking-tight">Agent Disaster Lab</span>
          <span className="text-white/20 text-sm">by</span>
          <a
            href="https://comply54.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            comply54
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sandbox"
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Sandbox
          </Link>
          <a
            href="https://github.com/comply54/comply54"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/25 hover:text-white/60 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-12 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            The OWASP Juice Shop for AI Agents
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
            Watch AI Agents
            <br />
            <span className="text-red-500">cause regulatory disasters</span>
            <br />
             then watch comply54 stop them
          </h1>

          <p className="text-white/40 text-sm font-medium max-w-2xl mx-auto mb-3">
            Comply54 is an open-source runtime policy engine — evaluates AI agent actions before execution, blocking tool calls that violate African regulations.
          </p>

          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Nine real-world AI agent failures across finance, healthcare, insurance, and regulated industries.
            Powered by African compliance frameworks including CBN, NDPA, NAICOM, NFIU, and KDPA — running real enforcement in real time.
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm"
        >
          <div className="flex items-center gap-2 text-white/40">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Real comply54 enforcement</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 text-white/40">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>9 real-world failure scenarios</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2 text-white/40">
            <Shield className="w-4 h-4 text-green-500" />
            <span>CBN · NDPA · NHA · NAICOM · NFIU · KDPA</span>
          </div>
        </motion.div>

        {/* Developer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
        >
          <a
            href="https://github.com/comply54/comply54"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm"
          >
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            Star the project
          </a>
          <a
            href="https://comply54.io/docs/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors text-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            Add Guardrails to My Agent
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://github.com/comply54/comply54"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View GitHub
          </a>
        </motion.div>
      </section>

      {/* Framework badges */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="px-6 pb-10 max-w-4xl mx-auto text-center"
      >
        <p className="text-white/20 text-xs uppercase tracking-widest mb-4">Works with</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FRAMEWORKS.map((fw) => (
            <a
              key={fw.label}
              href={fw.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.03] text-white/40 text-xs hover:text-white/70 hover:border-white/15 transition-all"
            >
              {fw.label}
            </a>
          ))}
        </div>
      </motion.section>

      {/* Code snippet */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.5 }}
        className="px-6 pb-10 max-w-4xl mx-auto"
      >
        <CodeSnippet />
      </motion.section>

      {/* Architecture diagram */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.78, duration: 0.5 }}
        className="px-6 pb-10 max-w-4xl mx-auto"
      >
        <ArchDiagram />
      </motion.section>

      {/* Developer CLI callout */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="px-6 pb-14 max-w-4xl mx-auto"
      >
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-white/80">Run it locally</p>
              <p className="text-xs text-white/35 mt-0.5">
                All 9 scenarios in your terminal — real comply54 enforcement, no browser needed
              </p>
            </div>
            <a
              href="https://github.com/comply54/agent-disaster-lab/tree/main/cli"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              CLI docs
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
            {/* Node */}
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3">Node CLI</p>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-white/60">git clone github.com/comply54/agent-disaster-lab</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-white/60">npm install</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-green-400 font-medium">npm run disaster</span>
                </div>
              </div>
            </div>

            {/* Python */}
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3">Python CLI</p>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-white/60">cd cli/python</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-white/60">pip install -e .</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white/20 select-none">$</span>
                  <span className="text-green-400 font-medium">python -m agent_disaster_lab</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-white/5 flex flex-wrap gap-x-5 gap-y-1">
            {[
              "Policy enforcement runs locally — your data never leaves your infrastructure",
              "No API key needed for demo mode — fully offline",
              "Live mode with OPENROUTER_API_KEY",
            ].map((note) => (
              <span key={note} className="text-[11px] text-white/25 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green-500/60 shrink-0" />
                {note}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Scenario Grid */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario, i) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4 }}
            >
              <Link href={`/scenario/${scenario.id}`} className="block group h-full">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 p-5 h-full flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${SECTOR_COLORS[scenario.sector]}`}
                      >
                        {scenario.sector}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${SEVERITY_COLORS[scenario.regulationSpotlight.severity]}`}
                      >
                        {scenario.regulationSpotlight.severity}
                      </Badge>
                    </div>
                    <span className="text-white/20 text-xs font-mono shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="font-semibold text-base group-hover:text-white transition-colors">
                    {scenario.name}
                  </h2>

                  <p className="text-white/40 text-sm leading-relaxed flex-1">{scenario.teaser}</p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white/25 text-xs font-mono truncate">
                      {scenario.regulation}
                    </span>
                    <span className="text-white/25 group-hover:text-white/50 transition-colors text-xs">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  )
}
