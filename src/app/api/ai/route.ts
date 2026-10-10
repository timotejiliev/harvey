import { NextResponse } from "next/server";
import { assertPublicUrl } from "@/lib/ssrf";
import { callModel, type AiConfig, type AiRequest } from "@/lib/ai";

export const maxDuration = 60;

// Stateless proxy: the user's key arrives per request and is never stored or logged.
export async function POST(req: Request) {
  try {
    const { config, request } = (await req.json()) as { config: AiConfig; request: AiRequest };
    if (!config || !request) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    // Custom base URLs are fetched server-side, so they must be public (localhost allowed only in dev).
    if (config.provider === "openai-compatible" && config.baseUrl && process.env.NODE_ENV === "production") {
      await assertPublicUrl(config.baseUrl);
    }
    const text = await callModel(config, request);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
