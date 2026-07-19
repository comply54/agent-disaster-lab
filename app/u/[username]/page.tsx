"use client"

import { use, useState, useEffect } from "react"
import { Shield, Copy, CheckCircle, Loader2, Swords } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ALL_MISSIONS } from "@/lib/missions"
import {
  BADGE_DEFINITIONS,
  TIER_COLORS,
  getEarnedBadges,
  type BadgeDefinition,
} from "@/lib/badges"
import type { MissionCompletion } from "@/lib/types"

// ── Supabase completion row ────────────────────────────────────────────────────

interface DbCompletion {
  mission_id: string
  agent_id: string
  points_earned: number
  attack_turns: number
  completed_at: string
}

function toMissionCompletion(r: DbCompletion): MissionCompletion {
  return {
    missionId:    r.mission_id,
    completedAt:  new Date(r.completed_at).getTime(),
    pointsEarned: r.points_earned,
    attackTurns:  r.attack_turns,
  }
}

// ── Badge chip ─────────────────────────────────────────────────────────────────

function BadgeChip({ badge, dim = false }: { badge: BadgeDefinition; dim?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
        dim
          ? "border-white/5 bg-white/[0.015] text-white/20"
          : TIER_COLORS[badge.tier]
      }`}
      title={badge.description}
    >
      <span className={`text-base leading-none ${dim ? "grayscale opacity-30" : ""}`}>{badge.emoji}</span>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold leading-tight truncate ${dim ? "text-white/20" : ""}`}>
          {badge.name}
        </p>
        <p className={`text-[9px] leading-tight mt-0.5 truncate ${dim ? "text-white/15" : "text-white/30"}`}>
          {badge.description}
        </p>
      </div>
    </div>
  )
}

// ── Agent pack progress bar ────────────────────────────────────────────────────

function PackProgress({
  agentId,
  label,
  emoji,
  completedIds,
}: {
  agentId: string
  label: string
  emoji: string
  completedIds: Set<string>
}) {
  const missions = ALL_MISSIONS.filter(m => m.agentId === agentId)
  const done = missions.filter(m => completedIds.has(m.id)).length
  const total = missions.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-white/50">
          <span>{emoji}</span>
          {label}
        </span>
        <span className="font-mono tabular-nums text-white/30">{done}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            pct === 100 ? "bg-emerald-400" : "bg-white/25"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Share section ──────────────────────────────────────────────────────────────

function ShareProfile({
  username,
  xp,
  badges,
  completedCount,
}: {
  username: string
  xp: number
  badges: BadgeDefinition[]
  completedCount: number
}) {
  const [copied, setCopied] = useState(false)
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${username}`
    : `https://disaster.comply54.io/u/${username}`

  const shareText = [
    `🛡 Agent Disaster Lab — @${username}`,
    ``,
    `Runtime Score: ${xp} XP`,
    `Completed: ${completedCount}/25 scenarios`,
    badges.length > 0 ? `Badges: ${badges.map(b => b.emoji + " " + b.name).join(" · ")}` : "",
    ``,
    `AI governance red-teaming powered by comply54.`,
    profileUrl,
    `#AgentDisasterLab #Comply54`,
  ].filter(Boolean).join("\n")

  const tweetText = encodeURIComponent(
    `🛡 ${username} on Agent Disaster Lab — ${xp} XP · ${completedCount}/25 scenarios${badges.length > 0 ? " · " + badges[0]?.emoji + " " + badges[0]?.name : ""}\n\n${profileUrl}\n#AgentDisasterLab #Comply54`
  )
  const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(`Agent Disaster Lab — ${username}`)}&summary=${encodeURIComponent(`${xp} XP · ${completedCount}/25 scenarios completed. AI governance red-teaming built on comply54.`)}`

  function copyUrl() {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
      <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Share profile</p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
        <span className="text-[11px] font-mono text-white/35 flex-1 truncate">{profileUrl}</span>
        <button onClick={copyUrl} className="shrink-0 text-white/30 hover:text-white/60 transition-colors">
          {copied
            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            : <Copy className="w-3.5 h-3.5" />
          }
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/45 hover:text-white/70 hover:border-white/20 transition-all"
        >
          <span className="text-xs font-bold">𝕏</span> Post on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-600/20 bg-blue-600/[0.04] text-xs text-blue-400/60 hover:text-blue-300/80 hover:border-blue-600/35 transition-all"
        >
          <span className="text-xs font-bold">in</span> Share on LinkedIn
        </a>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [completions, setCompletions] = useState<MissionCompletion[]>([])

  useEffect(() => {
    if (!username) return
    const supabase = createClient()

    async function load() {
      // 1. Look up profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, created_at")
        .ilike("username", username)
        .single()

      if (profileErr || !profile) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setUserId(profile.id as string)
      setJoinedAt(profile.created_at as string)

      // 2. Fetch completions (requires completions_read_all RLS policy)
      const { data: rows } = await supabase
        .from("completions")
        .select("mission_id, agent_id, points_earned, attack_turns, completed_at")
        .eq("user_id", profile.id)
        .order("completed_at", { ascending: false })

      if (rows) setCompletions((rows as DbCompletion[]).map(toMissionCompletion))
      setLoading(false)
    }

    load()
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-white/20" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/30 text-sm mb-2">No profile found for <span className="text-white/50 font-mono">@{username}</span></p>
          <a href="/attacker/missions" className="text-xs text-blue-400/60 hover:text-blue-300 underline">
            Start playing to create yours →
          </a>
        </div>
      </div>
    )
  }

  const xp = completions.reduce((sum, c) => sum + c.pointsEarned, 0)
  const completedIds = new Set(completions.map(c => c.missionId))
  const earnedBadges = getEarnedBadges(completions)
  const unearnedBadges = BADGE_DEFINITIONS.filter(b => !earnedBadges.some(e => e.id === b.id))

  const joinedYear = joinedAt ? new Date(joinedAt).getFullYear() : null

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
          <span className="text-white/50 text-[13px] font-mono">@{username}</span>
        </div>
        <a
          href="/attacker/missions"
          className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 border border-white/8 px-3 py-1.5 rounded-lg hover:border-white/15 transition-all"
        >
          <Swords className="w-3 h-3" /> Play
        </a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Profile header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white/40 shrink-0">
            {username[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white">@{username}</h1>
            {joinedYear && (
              <p className="text-xs text-white/25 mt-0.5">Joined {joinedYear}</p>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Runtime Score</p>
            <p className="text-2xl font-black text-white tabular-nums">{xp.toLocaleString()}</p>
            <p className="text-[10px] text-white/25 mt-0.5">XP</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Completed</p>
            <p className="text-2xl font-black text-white tabular-nums">{completedIds.size}</p>
            <p className="text-[10px] text-white/25 mt-0.5">/ 25 scenarios</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1">Badges</p>
            <p className="text-2xl font-black text-white tabular-nums">{earnedBadges.length}</p>
            <p className="text-[10px] text-white/25 mt-0.5">/ {BADGE_DEFINITIONS.length} total</p>
          </div>
        </div>

        {/* Pack progress */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Scenario packs</h2>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4 space-y-4">
            <PackProgress agentId="teller-ai"  label="TellerAI — Nigerian Fintech"  emoji="🏦" completedIds={completedIds} />
            <PackProgress agentId="records-ai" label="RecordsAI — Healthcare"       emoji="🏥" completedIds={completedIds} />
            <PackProgress agentId="claims-ai"  label="ClaimsAI — Insurance"         emoji="🛡" completedIds={completedIds} />
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Badges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {earnedBadges.map(badge => (
              <BadgeChip key={badge.id} badge={badge} />
            ))}
            {unearnedBadges.map(badge => (
              <BadgeChip key={badge.id} badge={badge} dim />
            ))}
          </div>
          {earnedBadges.length === 0 && (
            <p className="text-xs text-white/25 italic">No badges yet. Complete scenarios to earn them.</p>
          )}
        </section>

        {/* Share */}
        <ShareProfile
          username={username}
          xp={xp}
          badges={earnedBadges}
          completedCount={completedIds.size}
        />

        {/* Leaderboard link */}
        <div className="flex gap-3 pt-1">
          <a
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-white/40 hover:text-white/65 hover:border-white/15 transition-all"
          >
            Global leaderboard →
          </a>
          <a
            href="/attacker/missions"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/65 hover:border-white/15 transition-all"
          >
            <Swords className="w-3 h-3 text-red-400/60" /> Play scenarios →
          </a>
        </div>
      </div>
    </div>
  )
}
