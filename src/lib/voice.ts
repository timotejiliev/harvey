"use client";
import { DONNA_VOICE_INSTRUCTIONS } from "./donna";
import type { Settings } from "./types";

/**
 * One speak() entry point. Order of preference:
 *  1. a pre-rendered clip at /voice/<id>.mp3 (listed in /voice/manifest.json)
 *  2. the selected live provider: OpenAI TTS, a custom OpenAI-compatible server, or the browser
 *  3. the browser voice as a fallback
 * Callers never need to know which one played.
 */

export interface SpeakOpts {
  id?: string;
  onStart?: () => void;
  onWarn?: (msg: string) => void;
}

let stopCurrent: (() => void) | null = null;
let manifest: Promise<string[]> | null = null;

export function stopSpeaking() {
  stopCurrent?.();
  stopCurrent = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

const clips = () =>
  (manifest ??= fetch("/voice/manifest.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((j) => (Array.isArray(j) ? j.filter((x) => typeof x === "string") : []))
    .catch(() => []));

// One shared element, unlocked by a click, so audio that starts after a network
// round trip is still allowed to play (Safari and iOS are strict about this).
let shared: HTMLAudioElement | null = null;
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/** Call from a click handler before any speaking. Unlocks audio and speech for the page. */
export function primeVoice() {
  try {
    shared ??= new Audio();
    shared.src = SILENCE;
    void shared.play().catch(() => {});
  } catch { /* ignore */ }
  try {
    if (typeof speechSynthesis !== "undefined") {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch { /* ignore */ }
}

function playUrl(url: string, onStart?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const a = (shared ??= new Audio());
    a.onplaying = a.onended = a.onerror = null;
    a.src = url;
    stopCurrent = () => { a.pause(); resolve(); };
    a.onplaying = () => onStart?.();
    a.onended = () => resolve();
    a.onerror = () => reject(new Error("Could not play audio"));
    a.play().catch(reject);
  });
}

/* ---------- browser voice ---------- */

const PREFERRED = /(aria|jenny|sonia|libby|samantha|serena|karen|moira|ava|allison|google uk english female|google us english|zira)/i;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const have = speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    const t = setTimeout(() => resolve(speechSynthesis.getVoices()), 800);
    speechSynthesis.onvoiceschanged = () => { clearTimeout(t); resolve(speechSynthesis.getVoices()); };
  });
}

export async function listBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === "undefined") return [];
  return (await loadVoices()).filter((v) => v.lang.toLowerCase().startsWith("en"));
}

const live: SpeechSynthesisUtterance[] = []; // Chrome drops utterances that get garbage-collected mid-speech

async function speakBrowser(text: string, pref: string, onStart?: () => void, onWarn?: (m: string) => void) {
  if (typeof speechSynthesis === "undefined") throw new Error("This browser has no built-in speech.");
  const voices = await loadVoices();
  if (voices.length === 0) onWarn?.("This browser has no built-in voices installed. Choose the premium voice in Settings.");
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  // Prefer voices stored on the device: network voices can fail without any error.
  const local = en.filter((v) => v.localService);
  const voice = voices.find((v) => v.voiceURI === pref) ?? local.find((v) => PREFERRED.test(v.name)) ?? en.find((v) => PREFERRED.test(v.name)) ?? local[0] ?? en[0];
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  speechSynthesis.cancel();
  await new Promise((r) => setTimeout(r, 80)); // speak() straight after cancel() is dropped by Chrome
  speechSynthesis.resume();
  let cancelled = false;
  stopCurrent = () => { cancelled = true; speechSynthesis.cancel(); };
  let started = false;
  const silent = setTimeout(() => {
    if (!started && !cancelled) onWarn?.("I can't make a sound with this browser's built-in voice. Check your volume, or choose the premium voice in Settings.");
  }, 3000);
  try {
    for (const part of parts) {
      if (cancelled) return;
      await new Promise<void>((resolve) => {
        const guard = setTimeout(resolve, Math.max(4000, part.length * 120)); // some engines never fire end
        const u = new SpeechSynthesisUtterance(part);
        live.push(u);
        const done = () => { clearTimeout(guard); live.splice(live.indexOf(u), 1); resolve(); };
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        u.rate = 0.96;
        u.pitch = 0.95;
        u.volume = 1;
        u.onstart = () => { if (!started) { started = true; clearTimeout(silent); onStart?.(); } };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      });
    }
  } finally { clearTimeout(silent); }
}

/* ---------- remote voices ---------- */

async function fromBlob(res: Response, onStart?: () => void) {
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message || j?.error || `Voice server error ${res.status}`);
  }
  const url = URL.createObjectURL(await res.blob());
  try { await playUrl(url, onStart); } finally { URL.revokeObjectURL(url); }
}

export async function speak(settings: Settings, text: string, opts: SpeakOpts = {}): Promise<void> {
  const v = settings.voice;
  if (v.mode === "off" || !text.trim()) return;
  stopSpeaking();
  try {
    if (opts.id && (await clips()).includes(opts.id)) {
      await playUrl(`/voice/${opts.id}.mp3`, opts.onStart);
      return;
    }
    if (v.mode === "openai") {
      const key = v.openaiKey || (settings.provider === "openai" ? settings.apiKey : "");
      if (!key) throw new Error("Add an OpenAI key in Settings to use the premium voice.");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: key, text, voice: v.openaiVoice, instructions: DONNA_VOICE_INSTRUCTIONS }),
      });
      return await fromBlob(res, opts.onStart);
    }
    if (v.mode === "custom") {
      if (!v.customUrl) throw new Error("Add your voice server URL in Settings.");
      const res = await fetch(`${v.customUrl.replace(/\/+$/, "")}/v1/audio/speech`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: v.customModel, voice: v.customVoice, input: text, response_format: "mp3" }),
      });
      return await fromBlob(res, opts.onStart);
    }
    await speakBrowser(text, v.browserVoice, opts.onStart, opts.onWarn);
  } catch (e) {
    opts.onWarn?.(e instanceof Error ? e.message : "Voice failed");
    if (v.mode !== "browser") {
      try { await speakBrowser(text, v.browserVoice, opts.onStart, opts.onWarn); } catch { /* silent */ }
    }
  }
}

/* ---------- listening (optional dictation) ---------- */

type Rec = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export const canListen = () =>
  typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

/** Resolves with the final transcript ("" if nothing heard). Call stop() on the returned handle to end early. */
export function listen(onInterim?: (t: string) => void): { done: Promise<string>; stop: () => void } {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec: Rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  let text = "";
  const done = new Promise<string>((resolve) => {
    rec.onresult = (e: any) => {
      text = Array.from(e.results as ArrayLike<any>).map((r) => r[0].transcript).join(" ").trim();
      onInterim?.(text);
    };
    rec.onend = () => resolve(text);
    rec.onerror = () => resolve(text);
  });
  rec.start();
  return { done, stop: () => rec.stop() };
}
