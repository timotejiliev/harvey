import lines from "./lines.json";

/**
 * Donna's character: confident, unflappable, quietly funny, always a step ahead.
 * Original writing inspired by an archetype (the brilliant right hand), not by any real
 * person's voice or scripted lines.
 *
 * Every spoken line is fixed text in lines.json, so each one can be rendered once to audio
 * (scripts/render-voice.mjs) and shipped with the app. No dynamic text is ever spoken:
 * anything personal (names, counts) is shown on screen instead.
 */
export type LineId = keyof typeof lines;

export interface Line {
  id: LineId | "";
  text: string;
}

export const L = (id: LineId): Line => ({ id, text: lines[id] });
export const ALL_LINES = lines as Record<string, string>;

/** Voice instructions for models that accept a style prompt (OpenAI TTS). */
export const DONNA_VOICE_INSTRUCTIONS =
  "Speak as a warm, self-assured woman in her late thirties. Unhurried pace, low and smooth register, a trace of dry amusement. Land the ends of sentences with certainty. Never chirpy, never robotic.";

export function greeting(name: string, hour = new Date().getHours()): string {
  const first = name.split(" ")[0];
  const part = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  return first ? `${part}, ${first}.` : `${part}.`;
}

export function pipelineLine(n: { jobs: number; due: number; ready: number }): Line {
  if (n.jobs === 0) return L("pipe-empty");
  if (n.due > 0) return L("pipe-due");
  if (n.ready > 0) return L("pipe-ready");
  return L("pipe-quiet");
}
