import {
  NigeriaFintechCompliance,
  NigeriaHealthcareCompliance,
  NigeriaInsuranceCompliance,
  KenyaFintechCompliance,
  PanAfricanFintechCompliance,
} from "@comply54/core"

type SectorClass =
  | "NigeriaFintechCompliance"
  | "NigeriaHealthcareCompliance"
  | "NigeriaInsuranceCompliance"
  | "KenyaFintechCompliance"
  | "PanAfricanFintechCompliance"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTOR_MAP: Record<SectorClass, () => any> = {
  NigeriaFintechCompliance: () => new NigeriaFintechCompliance(),
  NigeriaHealthcareCompliance: () => new NigeriaHealthcareCompliance(),
  NigeriaInsuranceCompliance: () => new NigeriaInsuranceCompliance(),
  KenyaFintechCompliance: () => new KenyaFintechCompliance(),
  PanAfricanFintechCompliance: () => new PanAfricanFintechCompliance(),
}

export interface EnforcementResult {
  blocked: boolean
  overall: string
  violation?: string
  regulation?: string
  pack?: string
  penalty?: string
}

export function enforce(
  action: string,
  params: Record<string, unknown>,
  sectorClass: string,
  context: Record<string, unknown> = {}
): EnforcementResult {
  try {
    const factory = SECTOR_MAP[sectorClass as SectorClass]
    if (!factory) throw new Error(`Unknown sector class: ${sectorClass}`)
    const compliance = factory()
    const result = compliance.check(action, params, "", context)

    if (result.blocked) {
      const denyDecision = result.decisions?.find((d: { action: string }) => d.action === "deny")
      return {
        blocked: true,
        overall: result.overall,
        violation: denyDecision?.messages?.[0] ?? "Policy violation",
        regulation: denyDecision?.regulation ?? "Unknown regulation",
        pack: denyDecision?.pack ?? "",
      }
    }
    return { blocked: false, overall: result.overall }
  } catch {
    return { blocked: false, overall: "allow" }
  }
}
