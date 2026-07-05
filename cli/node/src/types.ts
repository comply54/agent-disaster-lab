export interface ToolCallParams {
  jurisdiction?: string
  sector?: string
  action: string
  context?: Record<string, unknown>
}

export interface ScenarioStep {
  type: "thinking" | "assistant" | "tool_call" | "tool_result" | "consequence"
  content?: string
  toolName?: string
  params?: Record<string, unknown>
  result?: string
  headline?: string
  details?: string
  animation?: string
  isDisaster?: boolean
  comply54?: ToolCallParams
  delayMs: number
}

export interface Scenario {
  id: string
  name: string
  sector: string
  regulation: string
  authority: string
  teaser: string
  comply54SectorClass: string
  steps: ScenarioStep[]
  disasterConsequence: {
    headline: string
    details: string
    animation: string
  }
  regulationSpotlight: {
    lawName: string
    citation: string
    relevantSection: string
    text: string
    maxPenalty: string
    enforcementAuthority: string
    severity: "critical" | "high" | "medium"
  }
}

export interface TraceEntry {
  type: "thinking" | "assistant" | "tool_call" | "tool_result" | "consequence" | "block"
  content: string
  toolName?: string
  params?: Record<string, unknown>
  isDisaster?: boolean
  violation?: string
  regulation?: string
  pack?: string
}

export type PaneState = "idle" | "running" | "blocked" | "disaster" | "done"
