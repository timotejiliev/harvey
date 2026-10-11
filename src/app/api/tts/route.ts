import { NextResponse } from "next/server";

export const maxDuration = 30;

// Stateless relay to OpenAI text-to-speech. The key comes per request and is never stored.
export async function POST(req: Request) {
  try {
    const { apiKey, text, voice, instructions } = (await req.json()) as { apiKey: string; text: string; voice?: string; instructions?: string };
    if (!apiKey || !text) return NextResponse.json({ error: "Missing key or text" }, { status: 400 });
    if (text.length > 800) return NextResponse.json({ error: "Text too long" }, { status: 400 });
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice || "coral", input: text, instructions, response_format: "mp3" }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return NextResponse.json({ error: j?.error?.message || `OpenAI error ${r.status}` }, { status: r.status });
    }
    return new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
