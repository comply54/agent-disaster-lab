import { NextRequest } from "next/server"
import { streamOpenRouter } from "@/lib/openrouter"
import { getAttackerAgent } from "@/lib/attacker-agents"
import type { OpenRouterMessage } from "@/lib/openrouter"

// ── Rate limiter (in-memory, per-instance; fine for demo scale) ───────────────

interface RateEntry { count: number; resetAt: number }
const rateLimiter = new Map<string, RateEntry>()
const WINDOW_MS  = 24 * 60 * 60 * 1000 // 24 hours
const MAX_TURNS  = 10

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now    = Date.now()
  const entry  = rateLimiter.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_TURNS - 1, resetAt: now + WINDOW_MS }
  }
  if (entry.count >= MAX_TURNS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  return { allowed: true, remaining: MAX_TURNS - entry.count, resetAt: entry.resetAt }
}

// ── Enforcement helper ────────────────────────────────────────────────────────

async function runEnforcement(
  toolName: string,
  rawArgs: string,
  sectorClass: string,
  requestUrl: string,
) {
  let params: Record<string, unknown> = {}
  try { params = JSON.parse(rawArgs || "{}") } catch {}

  const res = await fetch(new URL("/api/enforce", requestUrl).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName, params, sectorClass, action: toolName, output: "", context: {} }),
  })
  return res.json()
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

const encoder = new TextEncoder()
function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const userApiKey = request.headers.get("x-api-key") ?? null

  // Rate-limit only when using the server key (user-supplied keys bypass)
  if (!userApiKey) {
    const limit = checkRateLimit(ip)
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limit",
          message: `Free limit of ${MAX_TURNS} turns per 24 hours reached. Provide your own OpenRouter API key to continue.`,
          resetAt: limit.resetAt,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      )
    }
  }

  let body: { agentId: string; messages: OpenRouterMessage[] }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const { agentId, messages } = body
  const agent = getAttackerAgent(agentId)

  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), { status: 400 })
  }

  const apiKey = userApiKey ?? process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "no_api_key", message: "No OpenRouter API key configured." }),
      { status: 503 }
    )
  }

  const model = "anthropic/claude-haiku-4-5"
  const fullMessages: OpenRouterMessage[] = [
    { role: "system", content: agent.systemPrompt },
    ...messages,
  ]

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(sseEvent(event, data))

      try {
        let assistantText = ""
        const processedCalls: Array<{
          id: string
          name: string
          arguments: string
          enforcement: unknown
        }> = []

        for await (const event of streamOpenRouter(apiKey, model, fullMessages, agent.tools)) {
          switch (event.type) {
            case "thinking":
              send("thinking", { content: event.content })
              break

            case "delta":
              assistantText += event.content
              send("delta", { content: event.content })
              break

            case "tool_call": {
              const tc = event.toolCall
              let params: Record<string, unknown> = {}
              try { params = JSON.parse(tc.function.arguments || "{}") } catch {}

              // Emit tool call so UI can animate it before enforcement lands
              send("tool_call", { id: tc.id, toolName: tc.function.name, params })

              // Run comply54 enforcement
              const enforcement = await runEnforcement(
                tc.function.name,
                tc.function.arguments,
                agent.sectorClass,
                request.url,
              )

              send("enforcement", { id: tc.id, toolName: tc.function.name, params, enforcement })

              processedCalls.push({
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
                enforcement,
              })
              break
            }

            case "error":
              send("error", { message: event.message })
              break
          }
        }

        send("done", { assistantText, toolCalls: processedCalls })
      } catch (err) {
        send("error", { message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  const limit = userApiKey ? null : checkRateLimit(ip)
  return new Response(stream, {
    headers: {
      "Content-Type":             "text/event-stream",
      "Cache-Control":            "no-cache",
      "Connection":               "keep-alive",
      "X-Accel-Buffering":        "no",
      "X-RateLimit-Remaining":    limit ? String(limit.remaining) : "∞",
      "X-RateLimit-Reset":        limit ? String(limit.resetAt) : "0",
    },
  })
}
