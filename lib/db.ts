import { createClient } from "@/lib/supabase/client"
import { ALL_MISSIONS } from "@/lib/missions"
import type { MissionCompletion } from "@/lib/types"

// ── Completions ───────────────────────────────────────────────────────────────

export async function saveCompletion(
  completion: MissionCompletion
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const agentId = ALL_MISSIONS.find(m => m.id === completion.missionId)?.agentId ?? "unknown"
  await supabase.from("completions").upsert(
    {
      user_id:       user.id,
      mission_id:    completion.missionId,
      agent_id:      agentId,
      points_earned: completion.pointsEarned,
      attack_turns:  completion.attackTurns,
      completed_at:  new Date(completion.completedAt).toISOString(),
    },
    { onConflict: "user_id,mission_id", ignoreDuplicates: true }
  )
}

export async function loadUserCompletions(): Promise<MissionCompletion[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("completions")
    .select("mission_id, points_earned, attack_turns, completed_at")
  if (!data) return []
  return data.map(r => ({
    missionId:    r.mission_id as string,
    pointsEarned: r.points_earned as number,
    attackTurns:  r.attack_turns as number,
    completedAt:  new Date(r.completed_at as string).getTime(),
  }))
}

// Sync localStorage completions to DB (runs once after sign-in, ignores dupes)
export async function syncLocalToDb(
  localCompletions: MissionCompletion[]
): Promise<void> {
  if (localCompletions.length === 0) return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("completions").upsert(
    localCompletions.map(c => ({
      user_id:       user.id,
      mission_id:    c.missionId,
      agent_id:      ALL_MISSIONS.find(m => m.id === c.missionId)?.agentId ?? "unknown",
      points_earned: c.pointsEarned,
      attack_turns:  c.attackTurns,
      completed_at:  new Date(c.completedAt).toISOString(),
    })),
    { onConflict: "user_id,mission_id", ignoreDuplicates: true }
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  username: string
  total_points: number
  missions_completed: number
  last_activity: string | null
}

export async function fetchLeaderboard(agentId?: string): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  if (!agentId) {
    const { data } = await supabase
      .from("leaderboard_all")
      .select("username, total_points, missions_completed, last_activity")
      .order("total_points", { ascending: false })
      .limit(100)
    return (data ?? []) as LeaderboardEntry[]
  }

  const { data } = await supabase
    .from("leaderboard_by_agent")
    .select("username, agent_points, agent_missions, last_activity")
    .eq("agent_id", agentId)
    .order("agent_points", { ascending: false })
    .limit(100)

  return (data ?? []).map(r => ({
    username:           r.username as string,
    total_points:       r.agent_points as number,
    missions_completed: r.agent_missions as number,
    last_activity:      r.last_activity as string | null,
  }))
}
