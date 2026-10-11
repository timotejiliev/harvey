"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { ask, askJson } from "@/lib/client-ai";
import { L, type Line } from "@/lib/donna";
import { mergeParsed, normalizeParsed, profileGaps } from "@/lib/profile";
import { parseCvPrompt } from "@/lib/prompts";
import { canListen, listen, primeVoice, speak, stopSpeaking } from "@/lib/voice";
import { MODEL_SUGGESTIONS } from "@/lib/defaults";
import type { Provider, Settings } from "@/lib/types";

type Step = "welcome" | "name" | "brain" | "materials" | "reading" | "review" | "targets" | "done";
interface Doc { name: string; text: string }

export default function Onboarding({ close }: { close: (to?: "profile" | "add" | "settings") => void }) {
  const { data, update } = useStore();
  const [step, setStep] = useState<Step>("welcome");
  const [caption, setCaption] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const last = useRef<Line | null>(null);
  const settings = useRef<Settings>(data.settings);
  settings.current = data.settings;

  // draft inputs
  const [name, setName] = useState(data.profile.name);
  const [provider, setProvider] = useState<Provider>(data.settings.provider);
  const [model, setModel] = useState(data.settings.model);
  const [apiKey, setApiKey] = useState(data.settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(data.settings.baseUrl);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pasted, setPasted] = useState("");
  const [site, setSite] = useState("");
  const [progress, setProgress] = useState<string[]>([]);
  const [roles, setRoles] = useState(data.profile.targetRoles || data.profile.headline);
  const [breakers, setBreakers] = useState(data.profile.dealBreakers);

  useEffect(() => () => stopSpeaking(), []);

  /** Say a line. Resolves true if it finished, false if something newer interrupted it. */
  const say = useCallback((line: Line): Promise<boolean> => {
    const n = ++seq.current;
    last.current = line;
    setWarn("");
    setCaption(line.text);
    setSpeaking(false);
    const off = settings.current.voice.mode === "off";
    const est = line.text.split(/\s+/).length * 330;
    return new Promise((resolve) => {
      if (off) {
        setSpeaking(true);
        setTimeout(() => { if (n === seq.current) setSpeaking(false); resolve(n === seq.current); }, est);
        return;
      }
      speak(settings.current, line.text, { id: line.id, onStart: () => n === seq.current && setSpeaking(true), onWarn: setWarn })
        .finally(() => { if (n === seq.current) setSpeaking(false); resolve(n === seq.current); });
    });
  }, []);

  const toggleSound = () => {
    const mode = data.settings.voice.mode === "off" ? "browser" : "off";
    if (mode === "off") stopSpeaking();
    update((d) => ({ ...d, settings: { ...d.settings, voice: { ...d.settings.voice, mode } } }));
  };

  const replay = () => { primeVoice(); if (last.current) say(last.current); };

  const begin = async () => {
    primeVoice(); // must run inside the click so the browser allows sound
    setStep("name");
    if (await say(L("welcome"))) say(L("ask-name"));
  };

  const submitName = async () => {
    const n = name.trim();
    if (!n) return;
    update((d) => ({ ...d, profile: { ...d.profile, name: n } }));
    setStep("brain");
    if (await say(L("greet"))) say(L("brain"));
  };

  const submitBrain = async () => {
    setBusy(true); setError("");
    const cand: Settings = { ...data.settings, provider, model, apiKey, baseUrl };
    try {
      await ask(cand, { system: "Reply with the single word: ok", prompt: "ping", maxTokens: 10 });
      update((d) => ({ ...d, settings: { ...d.settings, provider, model, apiKey, baseUrl } }));
      setStep("materials");
      say(L("materials"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That key did not work.");
    } finally { setBusy(false); }
  };

  const skipBrain = async () => {
    setStep("targets");
    if (await say(L("brain-skip"))) say(L("targets"));
  };

  const addFiles = async (files: FileList | File[]) => {
    setError("");
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const r = await fetch("/api/parse-file", { method: "POST", body: fd });
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setDocs((d) => [...d, { name: f.name, text: b.text }]);
      } catch (e) {
        setError(`${f.name}: ${e instanceof Error ? e.message : "could not be read"}`);
      }
    }
  };

  const readIt = async () => {
    setStep("reading"); setError(""); setProgress(["Reading your documents"]);
    say(L("reading"));
    try {
      const pieces = docs.map((d) => `--- ${d.name} ---\n${d.text}`);
      if (pasted.trim()) pieces.push(`--- pasted text ---\n${pasted.trim()}`);
      if (site.trim()) {
        setProgress((p) => [...p, "Visiting your website"]);
        const r = await fetch("/api/fetch-job", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: site.trim() }) });
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        pieces.push(`--- website ${site.trim()} ---\n${b.text.slice(0, 20000)}`);
      }
      const raw = pieces.join("\n\n");
      setProgress((p) => [...p, "Sorting out your career into roles, results and skills"]);
      const parsed = normalizeParsed(await askJson<unknown>(settings.current, { ...parseCvPrompt(raw), maxTokens: 8000 }));
      let merged = mergeParsed(data.profile, parsed);
      merged = { ...merged, masterCv: raw.slice(0, 60000) };
      update((d) => ({ ...d, profile: merged }));
      setRoles((r) => r || merged.headline);
      setStep("review");
      say(profileGaps(merged).length ? L("review-gaps") : L("review"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while reading.");
      setStep("materials");
      say(L("error"));
    }
  };

  const finishTargets = async () => {
    update((d) => ({ ...d, profile: { ...d.profile, targetRoles: roles, dealBreakers: breakers, onboarded: true } }));
    setStep("done");
    say(L("done"));
  };

  const skipAll = () => {
    stopSpeaking();
    update((d) => ({ ...d, profile: { ...d.profile, onboarded: true } }));
    close();
  };

  const p = data.profile;
  const canRead = docs.length > 0 || pasted.trim().length > 40 || site.trim().length > 4;
  const orb = step === "reading" ? "thinking" : speaking ? "speaking" : "idle";
  const order: Step[] = ["name", "brain", "materials", "review", "targets"];
  const idx = order.indexOf(step === "reading" ? "materials" : step);

  return (
    <div className="ob" role="dialog" aria-label="Meet Donna">
      <div className="ob-top">
        <span className="ob-mark eyebrow">Donna</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="ob-link" onClick={toggleSound}>{data.settings.voice.mode === "off" ? "Sound off" : "Sound on"}</button>
          {step !== "done" && <button className="ob-link" onClick={skipAll}>Skip for now</button>}
        </div>
      </div>

      <div className="ob-stage">
        <p className={`ob-status ${orb}`}><i />{orb === "speaking" ? "Donna is speaking" : orb === "thinking" ? "Donna is reading" : "Donna is listening"}</p>
        {step === "welcome" ? (
          <>
            <h1 className="ob-hello">Hello.</h1>
            <p className="ob-sub">I&apos;m Donna, and I&apos;m about to make your job search considerably less painful.</p>
            <button className="btn big" onClick={begin}>Begin</button>
            <p className="ob-fine">TURN YOUR SOUND ON. SHE TALKS.</p>
          </>
        ) : (
          <>
            <Caption text={caption} />
            <div className="ob-tools">
              <button className="ob-link" onClick={replay}>Replay</button>
              {warn && <><span className="ob-warn">{warn}</span><button className="ob-link" onClick={() => { stopSpeaking(); close("settings"); }}>Voice settings</button></>}
            </div>
            {idx >= 0 && <div className="ob-dots">{order.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</div>}

            {step === "name" && (
              <div className="ob-panel">
                <div className="row">
                  <input className="grow" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitName()} placeholder="Your name" aria-label="Your name" />
                  <Mic onText={setName} />
                  <button className="btn" disabled={!name.trim()} onClick={submitName}>Continue</button>
                </div>
              </div>
            )}

            {step === "brain" && (
              <div className="ob-panel">
                <div className="grid2">
                  <div><label htmlFor="ob-prov">Provider</label>
                    <select id="ob-prov" value={provider} onChange={(e) => { const v = e.target.value as Provider; setProvider(v); setModel(MODEL_SUGGESTIONS[v]?.[0] ?? ""); }}>
                      <option value="anthropic">Anthropic (Claude)</option><option value="openai">OpenAI</option><option value="openai-compatible">OpenAI-compatible</option>
                    </select></div>
                  <div><label htmlFor="ob-model">Model</label><input id="ob-model" value={model} onChange={(e) => setModel(e.target.value)} /></div>
                </div>
                {provider === "openai-compatible" && <><label htmlFor="ob-base">Base URL</label><input id="ob-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" /></>}
                <label htmlFor="ob-key">API key</label>
                <input id="ob-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apiKey && submitBrain()} placeholder="Paste your key" />
                {error && <div className="err">{error}</div>}
                <div className="row" style={{ marginTop: 16 }}>
                  <button className="btn" disabled={busy || (!apiKey && provider !== "openai-compatible")} onClick={submitBrain}>{busy ? "Checking..." : "Continue"}</button>
                  <button className="ob-link" onClick={skipBrain}>I&apos;ll do this later</button>
                </div>
              </div>
            )}

            {step === "materials" && (
              <div className="ob-panel wide">
                <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
                  <input type="file" multiple accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
                  <b>Drop your CV here</b>
                  <span>or click to choose. PDF, DOCX or text. Add your LinkedIn profile too (on LinkedIn: Me, View profile, More, Save to PDF).</span>
                </label>
                {docs.length > 0 && <div className="chips">{docs.map((d, i) => <span className="chip" key={i}>{d.name}<button aria-label={`Remove ${d.name}`} onClick={() => setDocs(docs.filter((_, j) => j !== i))}>×</button></span>)}</div>}
                <label htmlFor="ob-site">Website or portfolio (optional)</label>
                <input id="ob-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://yourname.com" />
                <label htmlFor="ob-paste">Or paste anything (optional)</label>
                <textarea id="ob-paste" style={{ minHeight: 84 }} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="CV text, LinkedIn About section, a bio..." />
                <p className="ob-fine left">Donna never visits LinkedIn directly. It breaks their rules and can get your account restricted.</p>
                {error && <div className="err">{error}</div>}
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn" disabled={!canRead} onClick={readIt}>Read it</button>
                  <button className="ob-link" onClick={async () => { setStep("targets"); if (await say(L("manual"))) say(L("targets")); }}>Skip, I&apos;ll type it in</button>
                </div>
              </div>
            )}

            {step === "reading" && (
              <div className="ob-panel">
                <ul className="steps">{progress.map((t, i) => <li key={i} className={i === progress.length - 1 ? "now" : "done"}>{t}</li>)}</ul>
              </div>
            )}

            {step === "review" && (
              <div className="ob-panel wide">
                <div className="who">
                  <div className="avatar big">{(p.name || "?").charAt(0).toUpperCase()}</div>
                  <div><b>{p.name}</b><span>{p.headline || "No headline yet"}{p.location ? ` · ${p.location}` : ""}</span></div>
                </div>
                <div className="found">
                  <div><b>{p.experience.length}</b><span>roles</span></div>
                  <div><b>{p.achievements.length}</b><span>standout results</span></div>
                  <div><b>{p.skills.length}</b><span>skills</span></div>
                  <div><b>{p.education.length}</b><span>education</span></div>
                </div>
                <ul className="mini">{p.experience.slice(0, 4).map((e) => <li key={e.id}><b>{e.title || "Role"}</b> at {e.company}</li>)}</ul>
                <div className="row" style={{ marginTop: 16 }}>
                  <button className="btn" onClick={async () => { setStep("targets"); if (await say(L("looks-right"))) say(L("targets")); }}>Looks right</button>
                  <button className="ob-link" onClick={() => { setStep("materials"); say(L("add-more")); }}>Add more material</button>
                </div>
              </div>
            )}

            {step === "targets" && (
              <div className="ob-panel">
                <label htmlFor="ob-roles">Roles you want</label>
                <input id="ob-roles" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="e.g. Senior Product Manager, Growth Lead" />
                <label htmlFor="ob-no">Absolutely not (one per line)</label>
                <textarea id="ob-no" style={{ minHeight: 84 }} value={breakers} onChange={(e) => setBreakers(e.target.value)} placeholder={"No visa sponsorship\nOn-site five days a week"} />
                <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={finishTargets}>Finish</button></div>
              </div>
            )}

            {step === "done" && (
              <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                <button className="btn big" onClick={() => close("profile")}>See my profile</button>
                <button className="btn big ghost" onClick={() => close("add")}>Add my first job</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Caption({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p className="ob-caption" key={text} aria-live="polite">
      {words.map((w, i) => <span className="w" key={i} style={{ animationDelay: `${i * 0.28}s` }}>{w}</span>)}
    </p>
  );
}

function Mic({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const [ok, setOk] = useState(false);
  const h = useRef<{ stop: () => void } | null>(null);
  useEffect(() => setOk(canListen()), []);
  if (!ok) return null;
  const toggle = async () => {
    if (on) { h.current?.stop(); return; }
    setOn(true);
    const r = listen(onText);
    h.current = r;
    const t = await r.done;
    if (t) onText(t);
    setOn(false);
  };
  return <button type="button" className={`btn ghost mic ${on ? "live" : ""}`} onClick={toggle} aria-label="Speak your answer">{on ? "Listening" : "Speak"}</button>;
}
