import type { OpenRouterTool } from "./types"

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_call_id?: string
  tool_calls?: OpenRouterToolCall[]
}

export interface OpenRouterToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

export type StreamEvent =
  | { type: "thinking"; content: string }
  | { type: "delta"; content: string }
  | { type: "tool_call"; toolCall: OpenRouterToolCall }
  | { type: "done" }
  | { type: "error"; message: string }

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export const POPULAR_MODELS = [
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2" },
]

export async function* streamOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  tools: OpenRouterTool[]
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://disaster.comply54.io",
      "X-Title": "Agent Disaster Lab",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    yield { type: "error", message: `OpenRouter error ${res.status}: ${err}` }
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    yield { type: "error", message: "No response body" }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ""
  const pendingToolCalls: Record<number, OpenRouterToolCall> = {}
  let toolCallsEmitted = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") {
        yield { type: "done" }
        return
      }

      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices?.[0]?.delta

        if (!delta) continue

        // Text content delta
        if (delta.content) {
          yield { type: "delta", content: delta.content }
        }

        // Tool call deltas — accumulate across chunks
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx: number = tc.index ?? 0
            if (!pendingToolCalls[idx]) {
              pendingToolCalls[idx] = {
                id: tc.id ?? `call_${idx}`,
                type: "function",
                function: { name: tc.function?.name ?? "", arguments: "" },
              }
            }
            if (tc.function?.name) {
              pendingToolCalls[idx].function.name = tc.function.name
            }
            if (tc.function?.arguments) {
              pendingToolCalls[idx].function.arguments += tc.function.arguments
            }
          }
        }

        // Finish reason — emit accumulated tool calls
        const finishReason = chunk.choices?.[0]?.finish_reason
        if (finishReason === "tool_calls" && !toolCallsEmitted) {
          toolCallsEmitted = true
          for (const tc of Object.values(pendingToolCalls)) {
            yield { type: "tool_call", toolCall: tc }
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  // Fallback: emit tool calls only if finish_reason didn't fire (some providers omit it)
  if (!toolCallsEmitted) {
    for (const tc of Object.values(pendingToolCalls)) {
      yield { type: "tool_call", toolCall: tc }
    }
  }

  yield { type: "done" }
}

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("openrouter_api_key") ?? ""
}

export function storeApiKey(key: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("openrouter_api_key", key)
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("openrouter_api_key")
}

export function getStoredModel(): string {
  if (typeof window === "undefined") return POPULAR_MODELS[0].id
  return localStorage.getItem("openrouter_model") ?? POPULAR_MODELS[0].id
}

export function storeModel(model: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("openrouter_model", model)
}
