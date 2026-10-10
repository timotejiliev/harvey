"use client";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { MODEL_SUGGESTIONS } from "@/lib/defaults";
import { TEMPLATES } from "@/lib/templates";
import { ask } from "@/lib/client-ai";
import type { AppData, ExportFormat, Provider, TemplateId } from "@/lib/types";
import { Field, useAction } from "./ui";

export default function SettingsView() {
  const { data, update, replace } = useStore();
  const s = data.settings;
  const { busy, error, run } = useAction();
  const [okMsg, setOk] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const test = () =>
    run("test", async () => {
      setOk("");
      await ask(s, { system: "Reply with the single word: ok", prompt: "ping", maxTokens: 10 });
      setOk("Connected. Your key works.");
    });

  const backup = () => {
    const safe: AppData = { ...data, settings: { ...data.settings, apiKey: "" } };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" }));
    a.download = "harvey-backup.json";
    a.click();
  };
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as AppData;
      if (d.version !== 1) throw new Error("Unrecognised backup");
      replace({ ...d, settings: { ...d.settings, apiKey: data.settings.apiKey } });
      setOk("Backup restored.");
    } catch (e) {
      setOk(e instanceof Error ? e.message : "Invalid file");
    }
  };

  return (
    <>
      <h1>Settings</h1>
      <p className="sub">Bring your own AI key. It is stored only in this browser and sent per request to the AI provider through this app&apos;s server, which does not keep it.</p>
      <div className="card">
        <div className="grid2">
          <Field label="Provider">
            <select value={s.provider} onChange={(e) => set({ provider: e.target.value as Provider, model: MODEL_SUGGESTIONS[e.target.value]?.[0] ?? "" })}>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
              <option value="openai-compatible">OpenAI-compatible (OpenRouter, Ollama, Groq...)</option>
            </select>
          </Field>
          <Field label="Model">
            <input list="models" value={s.model} onChange={(e) => set({ model: e.target.value })} placeholder="model id" />
            <datalist id="models">{(MODEL_SUGGESTIONS[s.provider] ?? []).map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
        </div>
        {s.provider === "openai-compatible" && (
          <Field label="Base URL (must be publicly reachable, e.g. https://openrouter.ai/api/v1)">
            <input value={s.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
          </Field>
        )}
        <Field label="API key">
          <input type="password" autoComplete="off" value={s.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-..." />
        </Field>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={test} disabled={!!busy}>{busy ? "Testing..." : "Test connection"}</button>
          {okMsg && <span className="ok">{okMsg}</span>}
        </div>
        {error && <div className="err">{error}</div>}
      </div>

      <h2>Documents</h2>
      <div className="card">
        <div className="grid2">
          <Field label="Default export format">
            <select value={s.defaultFormat} onChange={(e) => set({ defaultFormat: e.target.value as ExportFormat })}>
              <option value="pdf">PDF</option><option value="docx">Word (.docx)</option><option value="md">Markdown</option>
            </select>
          </Field>
          <Field label="Default template">
            <select value={s.defaultTemplate} onChange={(e) => set({ defaultTemplate: e.target.value as TemplateId })}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}: {t.blurb}</option>)}
            </select>
          </Field>
        </div>
        <p className="muted small">You can still choose a different format or template per document, even after it is generated.</p>
      </div>

      <h2>Your data</h2>
      <div className="card">
        <p className="muted small">Data currently lives in this browser. Download a backup regularly (the API key is not included).</p>
        <div className="row">
          <button className="btn ghost" onClick={backup}>Download backup</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Restore backup</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
      </div>
    </>
  );
}
