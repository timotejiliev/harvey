# Donna's voice

Donna speaks in fixed lines (`src/lib/lines.json`). Every line is rendered once to an mp3 with an open-source voice model and shipped with the app in `public/voice/<voice>/`. Playing a recording costs nothing, needs no model download in the browser and works on free hosting.

| Mode | Cost | Quality | Needs |
|---|---|---|---|
| Natural (default) | Free | Natural, consistent | Nothing |
| Built in | Free | Robotic, device dependent | Nothing |
| Premium | Pay per use | Natural, steerable | The user's OpenAI key |
| Custom | Free | Whatever you run | An OpenAI-compatible voice server |

## Where the natural voice comes from

[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) v1.0 (82M parameters, Apache-2.0, so commercial use is allowed), run through the [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) runtime. Voices shipped: Heart, Bella, Nicole (American) and Emma (British). Users pick one in Settings.

## Changing or adding lines

Edit `src/lib/lines.json`, then re-render:

```bash
npm i --no-save sherpa-onnx-node
# download and extract kokoro-multi-lang-v1_0.tar.bz2 from
# https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models  (350 MB, one time)
KOKORO_DIR=/path/to/kokoro-multi-lang-v1_0 node scripts/render-voice.mjs          # all voices
KOKORO_DIR=/path/to/kokoro-multi-lang-v1_0 node scripts/render-voice.mjs af_heart # one voice
```

Requires `ffmpeg` on the path. Commit the changed files in `public/voice`. To add a voice, add its id and speaker id to `SPEAKERS` in the script (ids are listed in the model's metadata) and to `src/lib/voices.ts`.

Rule: spoken text is never built at runtime. Names, counts and other personal details appear on screen only, so every spoken line can be a recording.

## Free-form speech later

If Donna ever needs to say arbitrary text (for example reading back a drafted answer), run Kokoro in the browser with [kokoro-js](https://github.com/hexgrad/kokoro/tree/main/kokoro.js) (WebGPU or WASM, about 90 MB cached after the first download). That is not wired in yet.

## Do not clone a real person

Do not use a clone of an actress or any other real person's voice, or her recognisable lines, in a product you plan to sell. That raises right-of-publicity and impersonation problems. Use the open voices above, design an original one, or clone only a voice you have written permission to use.

## Custom server

`Custom` calls `POST {url}/v1/audio/speech` with `{model, voice, input, response_format: "mp3"}` straight from the browser, so the server must be OpenAI-compatible and allow CORS from your site. Not tested against VoiceStudio or voicebox.
