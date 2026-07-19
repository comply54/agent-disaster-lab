"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, Trophy, Swords, Loader2, RefreshCw, Medal } from "lucide-react"
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/db"
import { useAuth } from "@/lib/auth-context"

const TABS = [
  { id: undefined,        label: "All Packs",  emoji: "🏆" },
  { id: "teller-ai",     label: "TellerAI",   emoji: "🏦" },
  { id: "records-ai",    label: "RecordsAI",  emoji: "🏥" },
  { id: "claims-ai",     label: "ClaimsAI",   emoji: "🛡" },
] as const

const TAB_META: Record<string, { missions: number; pts: number }> = {
  "all":         { missions: 25, pts: 525 },
  "teller-ai":   { missions: 10, pts: 215 },
  "records-ai":  { missions: 8,  pts: 170 },
  "claims-ai":   { missions: 7,  pts: 140 },
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-4 h-4 text-yellow-400" />
  if (rank === 2) return <Medal className="w-4 h-4 text-white/50" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
  return <span className="text-[11px] font-mono text-white/25 tabular-nums">{rank}</span>
}

export default function LeaderboardPage() {
  const { user, username, openAuthModal } = useAuth()
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (agentId?: string, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    const data = await fetchLeaderboard(agentId)
    setEntries(data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load(activeTab) }, [activeTab, load])

  const meta = TAB_META[activeTab ?? "all"]
  const userRank = username
    ? entries.findIndex(e => e.username.toLowerCase() === username.toLowerCase()) + 1
    : 0

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 h-[57px] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <a href="/" className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-medium text-white/50">Agent Disaster Lab</span>
          </a>
          <span className="text-white/15">/</span>
          <a href="/attacker/missions" className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400/80">Scenarios</span>
          </a>
          <span className="text-white/15">/</span>
          <span className="text-white/60 font-medium">Leaderboard</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/50">
                {username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span>{username ?? "…"}</span>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-xs text-white/30 hover:text-white/60 transition-colors border border-white/8 px-3 py-1.5 rounded-lg hover:border-white/20"
            >
              Sign in to compete
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">Global Leaderboard</h1>
            </div>
            <p className="text-sm text-white/35">
              {meta.missions} scenarios · {meta.pts} total points
            </p>
          </div>
          <button
            onClick={() => load(activeTab, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mt-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Your rank banner */}
        {userRank > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 flex items-center gap-3">
            <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-white/60">
              You are ranked <span className="font-bold text-white">#{userRank}</span> with{" "}
              <span className="font-bold text-white tabular-nums">
                {entries[userRank - 1]?.total_points ?? 0}
              </span>{" "}
              points on this board.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl border border-white/6 bg-white/[0.02] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-white/20">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm font-medium">No scores yet</p>
            <p className="text-white/20 text-xs mt-1">Be the first on this board.</p>
            <a
              href="/attacker/missions"
              className="inline-flex items-center gap-1.5 mt-4 text-xs text-white/40 hover:text-white/60 transition-colors border border-white/8 px-4 py-2 rounded-lg hover:border-white/20"
            >
              Start simulating →
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem_5rem] gap-0 px-4 py-2.5 border-b border-white/5 bg-white/[0.015]">
              <span className="text-[10px] uppercase tracking-widest text-white/20">#</span>
              <span className="text-[10px] uppercase tracking-widest text-white/20">Player</span>
              <span className="text-[10px] uppercase tracking-widest text-white/20 text-right">Points</span>
              <span className="text-[10px] uppercase tracking-widest text-white/20 text-right">Scenarios</span>
              <span className="text-[10px] uppercase tracking-widest text-white/20 text-right">Last active</span>
            </div>

            {/* Rows */}
            {entries.map((entry, i) => {
              const rank = i + 1
              const isMe = username && entry.username.toLowerCase() === username.toLowerCase()
              return (
                <div
                  key={entry.username}
                  className={`grid grid-cols-[2.5rem_1fr_6rem_5rem_5rem] gap-0 px-4 py-3 border-b border-white/4 last:border-b-0 transition-colors ${
                    isMe
                      ? "bg-amber-500/[0.05] border-l-2 border-l-amber-500/40"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center">
                    <RankBadge rank={rank} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isMe ? "bg-amber-500/20 text-amber-300" : "bg-white/6 text-white/40"
                    }`}>
                      {entry.username[0].toUpperCase()}
                    </div>
                    <span className={`text-sm truncate ${isMe ? "text-white font-medium" : "text-white/70"}`}>
                      {entry.username}
                      {isMe && <span className="ml-1.5 text-[9px] text-amber-400/60 font-normal">you</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-bold tabular-nums ${
                      rank === 1 ? "text-yellow-400" :
                      rank === 2 ? "text-white/60" :
                      rank === 3 ? "text-amber-600" :
                      isMe ? "text-white" : "text-white/50"
                    }`}>
                      {entry.total_points.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-white/30 tabular-nums">{entry.missions_completed}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-[11px] text-white/25">{timeAgo(entry.last_activity)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Sign-in CTA for anon users */}
        {!user && (
          <div className="mt-8 rounded-xl border border-white/6 bg-white/[0.01] px-5 py-5 flex items-center gap-4">
            <Trophy className="w-8 h-8 text-yellow-400/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/60">Your score isn't saved</p>
              <p className="text-xs text-white/30 mt-0.5">Sign in to appear on the leaderboard and keep progress across devices.</p>
            </div>
            <button
              onClick={openAuthModal}
              className="shrink-0 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
