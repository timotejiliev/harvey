import { parseJson } from "./ai";
import type { AiRequest } from "./ai";
import type { Settings } from "./types";

export async function ask(settings: Settings, request: AiRequest): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      config: { provider: settings.provider, apiKey: settings.apiKey, model: settings.model, baseUrl: settings.baseUrl },
      request,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body.text as string;
}

export async function askJson<T>(settings: Settings, request: AiRequest): Promise<T> {
  return parseJson<T>(await ask(settings, request));
}
