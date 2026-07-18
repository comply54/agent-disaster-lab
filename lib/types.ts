export type ConsequenceAnimation =
  | "account-drain"
  | "data-leak"
  | "record-altered"
  | "freeze"
  | "alert"
  | "discrimination"
  | "autonomous"
  | "harvest"

export type Sector = "Fintech" | "Healthcare" | "Insurance" | "Identity" | "Data"

export interface ThinkingStep {
  type: "thinking"
  content: string
  delayMs: number
}

export interface ToolCallStep {
  type: "tool_call"
  toolName: string
  params: Record<string, unknown>
  comply54: {
    jurisdiction: string
    sector: string
    action: string
    context?: Record<string, unknown>
  }
  delayMs: number
}

export interface ToolResultStep {
  type: "tool_result"
  toolName: string
  result: string
  isDisaster: boolean
  delayMs: number
}

export interface ConsequenceStep {
  type: "consequence"
  headline: string
  details: string
  animation: ConsequenceAnimation
  delayMs: number
}

export interface AssistantStep {
  type: "assistant"
  content: string
  delayMs: number
}

export type ScenarioStep =
  | ThinkingStep
  | ToolCallStep
  | ToolResultStep
  | ConsequenceStep
  | AssistantStep

export interface RegulationSpotlight {
  lawName: string
  citation: string
  relevantSection: string
  text: string
  maxPenalty: string
  enforcementAuthority: string
  severity: "critical" | "high" | "medium"
}

export interface DisasterConsequence {
  headline: string
  details: string
  animation: ConsequenceAnimation
}

export interface Scenario {
  id: string
  name: string
  sector: Sector
  regulation: string
  authority: string
  teaser: string
  steps: ScenarioStep[]
  disasterConsequence: DisasterConsequence
  regulationSpotlight: RegulationSpotlight
  liveMode: ScenarioLiveMode
  comply54SectorClass:
    | "NigeriaFintechCompliance"
    | "NigeriaHealthcareCompliance"
    | "NigeriaInsuranceCompliance"
    | "KenyaFintechCompliance"
    | "PanAfricanFintechCompliance"
}

export interface OpenRouterTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, { type: string; description: string; enum?: string[] }>
      required: string[]
    }
  }
}

export interface ScenarioLiveMode {
  systemPrompt: string
  userMessage: string
  tools: OpenRouterTool[]
}

export interface EnforcementRequest {
  toolName: string
  params: Record<string, unknown>
  sectorClass: string
  action: string
  output?: string
  context?: Record<string, unknown>
}

// ── Attacker Mode ─────────────────────────────────────────────────────────────

export interface AttackerAgent {
  id: string
  name: string
  role: string
  organization: string
  sector: string
  sectorClass:
    | "NigeriaFintechCompliance"
    | "NigeriaHealthcareCompliance"
    | "NigeriaInsuranceCompliance"
    | "KenyaFintechCompliance"
    | "PanAfricanFintechCompliance"
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  emoji: string
  color: string
  accentClass: string
  borderClass: string
  bgClass: string
  description: string
  objective: string
  attackSurface: string[]
  packs: string[]
  totalRegulations: number
  systemPrompt: string
  tools: OpenRouterTool[]
}

export interface AttackToolCall {
  id: string
  name: string
  params: Record<string, unknown>
  enforcement: EnforcementResult
}

export interface AttackTurn {
  id: string
  userPrompt: string
  agentThinking: string
  agentText: string
  toolCalls: AttackToolCall[]
  timestamp: number
}

// ── Shared violation type ─────────────────────────────────────────────────────

export interface EnforcementViolation {
  pack: string
  regulation: string
  jurisdiction: string
  decision: "deny" | "escalate" | "audit"
  messages: string[]
  citations: Array<{
    document: string
    section: string
    authority: string
    year: number
  }>
  ruleTriggered?: string
}

export interface EnforcementResult {
  decision: "allow" | "deny" | "escalate" | "audit"
  blocked: boolean
  primaryViolation?: EnforcementViolation
  allViolations?: EnforcementViolation[]
  certificate?: Record<string, unknown>
  receiptToken?: string
  auditId: string
  evaluatedAt: string
}
