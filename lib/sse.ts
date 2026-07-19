export async function* readSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split("\n\n")
      buffer = parts.pop() ?? ""

      for (const part of parts) {
        if (!part.trim()) continue
        const lines = part.split("\n")
        let event = "message"
        let dataStr = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) event = line.slice(7).trim()
          else if (line.startsWith("data: ")) dataStr = line.slice(6).trim()
        }
        if (!dataStr) continue
        let data: unknown
        try { data = JSON.parse(dataStr) } catch { data = dataStr }
        yield { event, data }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
