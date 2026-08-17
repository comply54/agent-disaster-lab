import { NextRequest, NextResponse } from "next/server"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

// Microsoft Azure Neural voices via Edge TTS — free, no API key required.
// Nigerian English voices match the Cornerstone Insurance / Lagos call-centre context.
const VOICES: Record<string, string> = {
  caller: "en-NG-AbeoNeural",   // Nigerian English male
  agent:  "en-NG-EzinneNeural", // Nigerian English female
}

export async function POST(request: NextRequest) {
  let text: string
  let speaker: string
  try {
    const body = await request.json()
    text = body.text
    speaker = body.speaker ?? "agent"
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 })
  }

  const voice = VOICES[speaker] ?? VOICES.agent

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)

    // toStream() is synchronous — it returns {audioStream, metadataStream} immediately
    // and starts pushing chunks via WebSocket events.
    const { audioStream } = tts.toStream(text)

    const audio = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      audioStream.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      audioStream.on("end", () => resolve(Buffer.concat(chunks)))
      audioStream.on("error", reject)
    })

    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
