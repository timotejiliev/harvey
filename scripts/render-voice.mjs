#!/usr/bin/env node
/**
 * Renders every line in src/lib/lines.json to mp3 with Kokoro (open source, Apache-2.0)
 * for each voice in VOICES, into public/voice/<voice>/<id>.mp3 plus a manifest.json per voice.
 *
 * One-off setup (not part of the app):
 *   npm i --no-save sherpa-onnx-node            # offline synthesiser
 *   download + extract kokoro-multi-lang-v1_0.tar.bz2 from
 *   https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
 *   brew/apt install ffmpeg
 *   KOKORO_DIR=/path/to/kokoro-multi-lang-v1_0 node scripts/render-voice.mjs [voice ...]
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const sherpa = require("sherpa-onnx-node");
const dir = resolve(process.env.KOKORO_DIR ?? "");
if (!process.env.KOKORO_DIR) throw new Error("Set KOKORO_DIR to the extracted kokoro-multi-lang-v1_0 folder");

// speaker ids come from the model's own metadata (id2speaker)
const SPEAKERS = { af_heart: 3, af_bella: 2, af_nicole: 6, bf_emma: 21 };
const SPEED = 0.95; // unhurried
const wanted = process.argv.slice(2);
const voices = wanted.length ? wanted : Object.keys(SPEAKERS);
const lines = JSON.parse(readFileSync("src/lib/lines.json", "utf8"));

const tts = new sherpa.OfflineTts({
  model: {
    kokoro: {
      model: join(dir, "model.onnx"),
      voices: join(dir, "voices.bin"),
      tokens: join(dir, "tokens.txt"),
      dataDir: join(dir, "espeak-ng-data"),
      dictDir: join(dir, "dict"),
      lexicon: `${join(dir, "lexicon-us-en.txt")},${join(dir, "lexicon-zh.txt")}`,
    },
    debug: false,
    numThreads: 4,
    provider: "cpu",
  },
  maxNumSentences: 1,
});

for (const voice of voices) {
  const sid = SPEAKERS[voice];
  if (sid === undefined) throw new Error(`Unknown voice ${voice}`);
  const out = join("public", "voice", voice);
  mkdirSync(out, { recursive: true });
  const ids = [];
  for (const [id, text] of Object.entries(lines)) {
    const audio = tts.generate({ text, sid, speed: SPEED });
    const wav = join(tmpdir(), `donna-${voice}-${id}.wav`);
    sherpa.writeWave(wav, { samples: audio.samples, sampleRate: audio.sampleRate });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", join(out, `${id}.mp3`)]);
    rmSync(wav);
    ids.push(id);
    console.log(voice, id, (audio.samples.length / audio.sampleRate).toFixed(1) + "s");
  }
  writeFileSync(join(out, "manifest.json"), JSON.stringify(ids));
}
