import Link from "next/link"
import { Shield, FlaskConical } from "lucide-react"
import { SandboxChecker } from "@/components/SandboxChecker"

export const metadata = {
  title: "Sandbox — Agent Disaster Lab",
  description:
    "Test any AI agent action against African compliance regulations — CBN, NDPA, NHA, NAICOM, KDPA and more. No API key required.",
}

export default function SandboxPage() {
  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <Link
            href="/"
            className="font-semibold tracking-tight hover:text-white/80 transition-colors"
          >
            Agent Disaster Lab
          </Link>
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
            href="/"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← Scenarios
          </Link>
          <a
            href="https://github.com/comply54/comply54"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/25 hover:text-white/50 transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-14 pb-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/40 text-xs font-medium mb-6">
          <FlaskConical className="w-3.5 h-3.5" />
          Freeform enforcement sandbox
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Test your own agent actions
        </h1>
        <p className="text-white/45 text-base max-w-xl mx-auto leading-relaxed">
          Pick a sector, type any action and params, and see exactly what comply54 would block —
          before you write a single line of agent code.
        </p>
      </section>

      {/* Checker */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-6 sm:p-8">
          <SandboxChecker />
        </div>
      </section>

      {/* Footer callout */}
      <section className="px-6 pb-20 max-w-3xl mx-auto text-center">
        <p className="text-white/25 text-sm">
          Want to see full disaster scenarios with side-by-side comparison?{" "}
          <Link href="/" className="text-white/45 hover:text-white/70 underline transition-colors">
            View all 9 scenarios →
          </Link>
        </p>
      </section>
    </main>
  )
}
