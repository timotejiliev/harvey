import type { Provider } from "./types";

export interface AiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AiRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Single provider interface. A future hosted "full service" tier can add a
 * provider that uses our own server-side key without touching callers.
 */
export async function callModel(cfg: AiConfig, req: AiRequest): Promise<string> {
  if (!cfg.apiKey && cfg.provider !== "openai-compatible") {
    throw new Error("No API key set. Add one in Settings.");
  }
  if (!cfg.model) throw new Error("No model set. Choose one in Settings.");
  const max = req.maxTokens ?? 4096;

  if (cfg.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: max,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `Anthropic error ${res.status}`);
    return (body.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  }

  const base =
    cfg.provider === "openai"
      ? "https://api.openai.com/v1"
      : (cfg.baseUrl || "").replace(/\/+$/, "");
  if (!base) throw new Error("Base URL is required for OpenAI-compatible providers.");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: max,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `Provider error ${res.status}`);
  return body.choices?.[0]?.message?.content ?? "";
}

/** Extract the first JSON object from model output (tolerates code fences). */
export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model did not return JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
