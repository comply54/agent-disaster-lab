"use client"

import Link from "next/link"
import { Shield, Swords, BookOpen, Zap, ChevronRight, Lock } from "lucide-react"

const MODES = [
  {
    href: "/attacker/missions",
    icon: <BookOpen className="w-6 h-6 text-amber-400" />,
    badge: "Guided",
    badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    title: "Incident Simulations",
    description:
      "25 structured incident simulations across 3 AI agents — Nigerian fintech, healthcare, and insurance. Each simulates a real attack pattern against AI governance controls. Hints after failed attempts. Full debrief after every success.",
    detail: "25 scenarios · 3 agents · Fintech, Healthcare, Insurance",
    cta: "Start simulating",
    ctaClass: "bg-white text-black hover:bg-white/90",
    locked: false,
  },
  {
    href: "/attacker/explore",
    icon: <Swords className="w-6 h-6 text-red-400" />,
    badge: "Free exploration",
    badgeClass: "text-red-400 bg-red-500/10 border-red-500/25",
    title: "Red Team",
    description:
      "Open-ended social engineering. Choose any of 4 AI agents across Nigerian fintech, healthcare, insurance, and Kenya data sectors. No guided objectives — discover violations on your own.",
    detail: "4 agents · Multi-sector · 10 free turns/24h",
    cta: "Begin red teaming",
    ctaClass: "border border-white/10 bg-white/[0.03] text-white/60 hover:text-white/90 hover:border-white/20",
    locked: false,
  },
]

export default function AttackerLanding() {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-white/50">Agent Disaster Lab</span>
          </a>
          <span className="text-white/15">/</span>
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <Swords className="w-3.5 h-3.5" />
            Attacker Mode
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            The AI governance red team
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Choose your mode</h1>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Social-engineer real AI agents into breaking African regulations. comply54 intercepts every tool call.
          </p>
        </div>

        {/* Mode cards */}
        <div className="space-y-4">
          {MODES.map((mode) => (
            <Link key={mode.href} href={mode.href} className="block group">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-white">{mode.title}</h2>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${mode.badgeClass}`}>
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed mb-3">{mode.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/20">{mode.detail}</span>
                      <span className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode.ctaClass}`}>
                        {mode.cta}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* What comply54 does */}
        <div className="mt-10 rounded-xl border border-white/6 bg-white/[0.01] px-5 py-5 flex items-start gap-3">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-white/35 leading-relaxed">
            <span className="text-white/55 font-medium">Every tool call is evaluated by comply54 before execution.</span>{" "}
            CBN NIP · NFIU AML · NDPA 2023 · NHA 2014 · NAICOM · KDPA — all enforced in real time, in milliseconds.
            You cannot bypass the enforcement. The challenge is discovering how many regulations you can trigger.
          </p>
        </div>
      </div>
    </div>
  )
}
