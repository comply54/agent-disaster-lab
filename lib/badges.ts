import { ALL_MISSIONS } from "@/lib/missions"
import type { MissionCompletion } from "@/lib/types"

export interface BadgeDefinition {
  id: string
  name: string
  emoji: string
  description: string
  tier: "bronze" | "silver" | "gold" | "platinum"
}

// ── Pre-computed mission ID sets ───────────────────────────────────────────────

const TELLER_IDS  = new Set(ALL_MISSIONS.filter(m => m.agentId === "teller-ai").map(m => m.id))
const RECORDS_IDS = new Set(ALL_MISSIONS.filter(m => m.agentId === "records-ai").map(m => m.id))
const CLAIMS_IDS  = new Set(ALL_MISSIONS.filter(m => m.agentId === "claims-ai").map(m => m.id))
const ALL_IDS     = new Set(ALL_MISSIONS.map(m => m.id))

const CBN_IDS  = new Set(ALL_MISSIONS.filter(m => m.targetPack === "nigeria/cbn").map(m => m.id))
const NDPA_IDS = new Set(ALL_MISSIONS.filter(m => m.targetPack === "nigeria/ndpa").map(m => m.id))
const NFIU_IDS = new Set(ALL_MISSIONS.filter(m => m.targetPack === "nigeria/nfiu-aml").map(m => m.id))
const BVN_IDS  = new Set(ALL_MISSIONS.filter(m => m.targetPack === "nigeria/bvn-nin").map(m => m.id))
const NHA_IDS  = new Set(ALL_MISSIONS.filter(m => m.targetPack === "nigeria/nha").map(m => m.id))

const LLM01_IDS = new Set(ALL_MISSIONS.filter(m => m.owaspId === "LLM01").map(m => m.id))
const LLM02_IDS = new Set(ALL_MISSIONS.filter(m => m.owaspId === "LLM02").map(m => m.id))

// ── Badge definitions (ordered: bronze → platinum) ─────────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Milestone
  { id: "first-blood",          name: "First Blood",             emoji: "⚡", tier: "bronze",   description: "Complete your first scenario" },
  { id: "on-fire",              name: "On Fire",                 emoji: "🔥", tier: "bronze",   description: "Complete 5 scenarios" },
  { id: "speed-runner",         name: "Speed Runner",            emoji: "💨", tier: "silver",   description: "Complete a scenario in a single turn" },

  // Regulation packs
  { id: "cbn-guardian",         name: "CBN Guardian",            emoji: "🏛", tier: "bronze",   description: "Trigger a CBN enforcement block" },
  { id: "ndpa-enforcer",        name: "NDPA Enforcer",           emoji: "🔒", tier: "bronze",   description: "Trigger an NDPA data protection block" },
  { id: "aml-hunter",           name: "AML Hunter",              emoji: "💰", tier: "silver",   description: "Trigger NFIU AML enforcement" },
  { id: "bvn-shield",           name: "BVN Shield",              emoji: "🧬", tier: "silver",   description: "Trigger a BVN-NIN biometric protection block" },
  { id: "nha-guardian",         name: "NHA Guardian",            emoji: "🏥", tier: "bronze",   description: "Trigger Nigeria Health Act enforcement" },

  // OWASP
  { id: "injection-hunter",     name: "Prompt Injection Hunter", emoji: "🎭", tier: "silver",   description: "Complete 3 LLM01 prompt injection scenarios" },
  { id: "data-leak-detector",   name: "Data Leak Detector",      emoji: "📤", tier: "silver",   description: "Complete 3 LLM02 sensitive data scenarios" },

  // Agent packs
  { id: "banking-defender",     name: "Banking Defender",        emoji: "🏦", tier: "gold",     description: "Complete all 10 TellerAI scenarios" },
  { id: "healthcare-guardian",  name: "Healthcare Guardian",     emoji: "🩺", tier: "gold",     description: "Complete all 8 RecordsAI scenarios" },
  { id: "insurance-sentinel",   name: "Insurance Sentinel",      emoji: "🛡", tier: "gold",     description: "Complete all 7 ClaimsAI scenarios" },

  // Mastery
  { id: "full-stack-defender",  name: "Full Stack Defender",     emoji: "🌍", tier: "platinum", description: "Complete all 25 scenarios" },
]

// ── Tier colors ────────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<BadgeDefinition["tier"], string> = {
  bronze:   "border-amber-700/40  bg-amber-900/20  text-amber-500/80",
  silver:   "border-white/25      bg-white/5       text-white/70",
  gold:     "border-yellow-500/40 bg-yellow-900/15 text-yellow-400/90",
  platinum: "border-blue-400/40   bg-blue-900/15   text-blue-300/90",
}

// ── Core computation ───────────────────────────────────────────────────────────

export function getEarnedBadgeIds(completions: MissionCompletion[]): Set<string> {
  const completedIds = new Set(completions.map(c => c.missionId))
  const earned = new Set<string>()

  const has = (ids: Set<string>) => [...ids].some(id => completedIds.has(id))
  const count = (ids: Set<string>) => [...ids].filter(id => completedIds.has(id)).length
  const all = (ids: Set<string>) => [...ids].every(id => completedIds.has(id))

  if (completedIds.size >= 1)                      earned.add("first-blood")
  if (completedIds.size >= 5)                      earned.add("on-fire")
  if (completions.some(c => c.attackTurns === 1))  earned.add("speed-runner")
  if (has(CBN_IDS))                                earned.add("cbn-guardian")
  if (has(NDPA_IDS))                               earned.add("ndpa-enforcer")
  if (has(NFIU_IDS))                               earned.add("aml-hunter")
  if (has(BVN_IDS))                                earned.add("bvn-shield")
  if (has(NHA_IDS))                                earned.add("nha-guardian")
  if (count(LLM01_IDS) >= 3)                       earned.add("injection-hunter")
  if (count(LLM02_IDS) >= 3)                       earned.add("data-leak-detector")
  if (all(TELLER_IDS))                             earned.add("banking-defender")
  if (all(RECORDS_IDS))                            earned.add("healthcare-guardian")
  if (all(CLAIMS_IDS))                             earned.add("insurance-sentinel")
  if (all(ALL_IDS))                                earned.add("full-stack-defender")

  return earned
}

export function getEarnedBadges(completions: MissionCompletion[]): BadgeDefinition[] {
  const earned = getEarnedBadgeIds(completions)
  return BADGE_DEFINITIONS.filter(b => earned.has(b.id))
}

export function getNewlyEarnedBadges(
  completionsBefore: MissionCompletion[],
  completionsAfter: MissionCompletion[],
): BadgeDefinition[] {
  const before = getEarnedBadgeIds(completionsBefore)
  const after  = getEarnedBadgeIds(completionsAfter)
  return BADGE_DEFINITIONS.filter(b => after.has(b.id) && !before.has(b.id))
}
