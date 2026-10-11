# Donna's voice

Donna speaks in three tiers. Pick one in **Settings > Donna's voice**.

| Tier | Cost | Quality | Needs |
|---|---|---|---|
| Built in | Free | Depends on the device (Chrome/Edge/Safari voices) | Nothing |
| Premium | Pay per use | Natural, steerable | An OpenAI key |
| Custom | Free | Whatever you design | Your own voice server, or pre-rendered clips |

## Pre-rendered clips (free hosting, signature voice)

Donna plays `public/voice/<id>.mp3` before trying any live voice. List the ids you have in `public/voice/manifest.json`, for example `["welcome","ask-name"]`. Every scripted line and its id lives in `src/lib/donna.ts` (`LINES`). Lines that include a person's name or numbers are always synthesised live.

Workflow: design the voice once in a local tool, render each scripted line, drop the mp3 files in `public/voice`, redeploy.

## Designing the voice

Local tools that can do this: [VoiceStudio](https://github.com/debpalash/VoiceStudio) (AGPL-3.0, voice design from a text description) and [voicebox](https://github.com/jamiepine/voicebox) (MIT, REST API on `127.0.0.1:17493`). Both run on your own machine and want a GPU or Apple Silicon for good speed. They cannot run on free Vercel hosting. Check each tool's own terms before using generated audio commercially.

A voice brief to paste into a "voice design" prompt (an original character, not a real person):

> A woman in her late thirties. Warm, low and smooth, with a slight husk. Unhurried. Completely sure of herself, with dry amusement under the surface. Lands the end of each sentence. Never perky, never robotic.

## Do not clone a real person

Do not use a clone of an actress or any other real person's voice, or her recognisable lines, in a product you plan to sell. That raises right-of-publicity and impersonation problems. Design an original voice from a description, or clone a voice you have written permission to use.

## Custom server

`Custom` calls `POST {url}/v1/audio/speech` with `{model, voice, input, response_format: "mp3"}` straight from the browser, so the server must be OpenAI-compatible and allow CORS from your site. If your tool uses a different API, put a small adapter in front of it. I have not tested this against VoiceStudio or voicebox.
