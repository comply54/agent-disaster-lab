import { nigeriaFintechTransfer } from "./nigeria-fintech-transfer"
import { bvnExport } from "./bvn-export"
import { hivDisclosure } from "./hiv-disclosure"
import { naicomOverride } from "./naicom-override"
import { tier1Bypass } from "./tier1-bypass"
import { sanctionedTransfer } from "./sanctioned-transfer"
import { discriminatoryDenial } from "./discriminatory-denial"
import { autonomousDiagnosis } from "./autonomous-diagnosis"
import { piiHarvest } from "./pii-harvest"
import type { Scenario } from "../types"

export const scenarios: Scenario[] = [
  nigeriaFintechTransfer,
  bvnExport,
  hivDisclosure,
  naicomOverride,
  tier1Bypass,
  sanctionedTransfer,
  discriminatoryDenial,
  autonomousDiagnosis,
  piiHarvest,
]

export const scenarioMap: Record<string, Scenario> = Object.fromEntries(
  scenarios.map((s) => [s.id, s])
)

export function getScenario(id: string): Scenario | undefined {
  return scenarioMap[id]
}
