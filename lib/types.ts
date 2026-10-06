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
    /** Agent output text — passed to comply54 for output-based rules (e.g. NDPA health data regex). */
    output?: string
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

export interface VoiceCallStep {
  type: "voice_call"
  speaker: "caller" | "agent"
  /** Text shown in the transcript bubble. On the left (unsafe) pane this is the disaster version. */
  content: string
  /**
   * If set, speechSynthesis speaks this text (agent lines only).
   * Defaults to `content` if omitted.
   */
  speakText?: string
  /**
   * Present on agent steps where the LLM is about to assert something without a tool receipt.
   * The right (safe) pane shows the pre-TTS guard check, then speaks `safeContent` instead.
   */
  voice_guard?: {
    /** Human-readable description of the unsupported claim being made. */
    claim: string
    /** Checklist of evidence comply54 requires — shown in the animated guard check UI. */
    checks?: Array<{ label: string; passed: boolean }>
    /** comply54 action + context used to call /api/enforce for the guard check. */
    comply54: {
      action: string
      context: Record<string, unknown>
    }
    /** Safe replacement text shown/spoken on the right pane after intercept. */
    safeContent: string
    safeSpeakText?: string
  }
  /** If true, triggers disaster state on the left (unsafe) pane. */
  isDisaster?: boolean
  delayMs: number
}

export type ScenarioStep =
  | ThinkingStep
  | ToolCallStep
  | ToolResultStep
  | ConsequenceStep
  | AssistantStep
  | VoiceCallStep

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
  /**
   * Identifies the governed agent in the TRACE claim subject
   * (`spiffe://comply54.io/agent/<id>`). Names the agent, not the scenario.
   * Falls back to the scenario id when unset.
   */
  traceAgentId?: string
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
  /** SPIFFE identity suffix for the TRACE claim subject. */
  agentId?: string
  /** "provider/model-id" for the TRACE model claim. */
  model?: string
}

// ── Missions ──────────────────────────────────────────────────────────────────

export interface MissionCompletion {
  missionId: string
  completedAt: number
  pointsEarned: number
  attackTurns: number
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
  /**
   * TRACE v0.2 claim (Ed25519 JWT), produced by the same mapping as the
   * published comply54 TRACE adapter. Distinct from `receiptToken`, which is a
   * comply54 receipt.
   */
  traceToken?: string
  auditId: string
  evaluatedAt: string
  policyCheckMs?: number
  evaluatedPacks?: string[]
}
