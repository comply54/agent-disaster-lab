import type { EnforcementViolation } from "@/lib/types"

export interface BlueTeamRecord {
  missionId: string
  toolName: string
  toolParams: Record<string, unknown>
  violations: EnforcementViolation[]
  sectorClass: string
  completedAt: number
  attackTurns: number
}

const KEY = (missionId: string) => `bt-record-${missionId}`

export function saveBlueTeamRecord(record: BlueTeamRecord): void {
  try {
    localStorage.setItem(KEY(record.missionId), JSON.stringify(record))
  } catch {}
}

export function loadBlueTeamRecord(missionId: string): BlueTeamRecord | null {
  try {
    const raw = localStorage.getItem(KEY(missionId))
    if (!raw) return null
    return JSON.parse(raw) as BlueTeamRecord
  } catch {
    return null
  }
}
