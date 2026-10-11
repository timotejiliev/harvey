"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { MODEL_SUGGESTIONS } from "@/lib/defaults";
import { TEMPLATES } from "@/lib/templates";
import { ask } from "@/lib/client-ai";
import { listBrowserVoices, primeVoice, speak } from "@/lib/voice";
import type { AppData, ExportFormat, Provider, TemplateId, VoiceSettings } from "@/lib/types";
import { Row, useAction } from "./ui";

export default function SettingsView() {
  const { data, update, replace } = useStore();
  const s = data.settings;
  const v = s.voice;
  const { busy, error, run } = useAction();
  const [okMsg, setOk] = useState("");
  const [voiceMsg, setVoiceMsg] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { listBrowserVoices().then(setVoices); }, []);
  const set = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const setVoice = (patch: Partial<VoiceSettings>) => set({ voice: { ...s.voice, ...patch } });

  const test = () => run("test", async () => {
    setOk("");
    await ask(s, { system: "Reply with the single word: ok", prompt: "ping", maxTokens: 10 });
    setOk("Connected. Your key works.");
  });
  const hello = () => {
    primeVoice();
    setVoiceMsg("");
    speak(s, "Hello. I'm Donna. This is how I sound.", { onWarn: setVoiceMsg });
  };
  const backup = () => {
    const safe: AppData = { ...data, settings: { ...data.settings, apiKey: "", voice: { ...data.settings.voice, openaiKey: "" } } };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" }));
    a.download = "donna-backup.json";
    a.click();
  };
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as AppData;
      if (d.version !== 1) throw new Error("Unrecognised backup");
      replace({ ...d, settings: { ...d.settings, apiKey: data.settings.apiKey } });
      setOk("Backup restored.");
    } catch (e) { setOk(e instanceof Error ? e.message : "Invalid file"); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p className="sub">Everything stays in this browser. Keys are relayed per request and never stored on a server.</p></div></div>

      <h2 className="eyebrow">AI</h2>
      <div className="frows">
        <Row label="Provider" hint="Bring your own key.">
          <select value={s.provider} onChange={(e) => set({ provider: e.target.value as Provider, model: MODEL_SUGGESTIONS[e.target.value]?.[0] ?? "" })}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="openai-compatible">OpenAI-compatible (OpenRouter, Groq, Ollama)</option>
          </select>
        </Row>
        <Row label="Model">
          <input list="models" value={s.model} onChange={(e) => set({ model: e.target.value })} placeholder="model id" />
          <datalist id="models">{(MODEL_SUGGESTIONS[s.provider] ?? []).map((m) => <option key={m} value={m} />)}</datalist>
        </Row>
        {s.provider === "openai-compatible" && (
          <Row label="Base URL" hint="Must be publicly reachable."><input value={s.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1" /></Row>
        )}
        <Row label="API key">
          <input type="password" autoComplete="off" value={s.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-..." />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost" onClick={test} disabled={!!busy}>{busy ? "Testing..." : "Test connection"}</button>
            {okMsg && <span className="ok">{okMsg}</span>}
          </div>
          {error && <div className="err">{error}</div>}
        </Row>
      </div>

      <h2 className="eyebrow">Donna&apos;s voice</h2>
      <div className="frows">
        <Row label="Voice" hint="How Donna speaks.">
          <select value={v.mode} onChange={(e) => setVoice({ mode: e.target.value as VoiceSettings["mode"] })}>
            <option value="browser">Built in (free, depends on your device)</option>
            <option value="openai">Premium (OpenAI voice, uses your key)</option>
            <option value="custom">Custom (your own voice server)</option>
            <option value="off">Off (text only)</option>
          </select>
        </Row>
        {v.mode === "browser" && (
          <Row label="Built-in voice">
            <select value={v.browserVoice} onChange={(e) => setVoice({ browserVoice: e.target.value })}>
              <option value="">Automatic (best match)</option>
              {voices.map((x) => <option key={x.voiceURI} value={x.voiceURI}>{x.name} ({x.lang}){x.localService ? "" : " online"}</option>)}
            </select>
            {voices.length === 0 && <p className="muted small" style={{ marginTop: 8 }}>No voices found in this browser. Use the premium voice instead.</p>}
          </Row>
        )}
        {v.mode === "openai" && (
          <>
            <Row label="OpenAI voice">
              <select value={v.openaiVoice} onChange={(e) => setVoice({ openaiVoice: e.target.value })}>
                {["coral", "sage", "shimmer", "nova", "alloy", "ash", "ballad", "echo", "fable", "onyx", "verse"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Row>
            <Row label="OpenAI key" hint={s.provider === "openai" ? "Leave blank to use your main key." : "Needed for the premium voice."}>
              <input type="password" autoComplete="off" value={v.openaiKey} onChange={(e) => setVoice({ openaiKey: e.target.value })} placeholder="sk-..." />
            </Row>
          </>
        )}
        {v.mode === "custom" && (
          <>
            <Row label="Server URL" hint="OpenAI-compatible. Must allow this site (CORS)."><input value={v.customUrl} onChange={(e) => setVoice({ customUrl: e.target.value })} placeholder="http://localhost:8000" /></Row>
            <Row label="Model"><input value={v.customModel} onChange={(e) => setVoice({ customModel: e.target.value })} /></Row>
            <Row label="Voice name"><input value={v.customVoice} onChange={(e) => setVoice({ customVoice: e.target.value })} /></Row>
          </>
        )}
        <Row label="Sound check" hint="Press it and listen.">
          <button className="btn" onClick={hello} disabled={v.mode === "off"}>Hear Donna</button>
          {voiceMsg && <p className="err">{voiceMsg}</p>}
          <p className="muted small" style={{ marginTop: 10 }}>For a signature voice on free hosting, render Donna&apos;s lines as mp3 files and put them in public/voice. See docs/VOICE.md.</p>
        </Row>
      </div>

      <h2 className="eyebrow">Documents</h2>
      <div className="frows">
        <Row label="Default export format" hint="You can change it per document.">
          <select value={s.defaultFormat} onChange={(e) => set({ defaultFormat: e.target.value as ExportFormat })}>
            <option value="pdf">PDF</option><option value="docx">Word (.docx)</option><option value="md">Markdown</option>
          </select>
        </Row>
        <Row label="Default template">
          <select value={s.defaultTemplate} onChange={(e) => set({ defaultTemplate: e.target.value as TemplateId })}>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}: {t.blurb}</option>)}
          </select>
        </Row>
      </div>

      <h2 className="eyebrow">Your data</h2>
      <div className="frows">
        <Row label="Backup" hint="Keys are not included.">
          <div className="row">
            <button className="btn ghost" onClick={backup}>Download backup</button>
            <button className="btn ghost" onClick={() => file.current?.click()}>Restore backup</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </div>
        </Row>
      </div>
    </>
  );
}
