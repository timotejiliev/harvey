# Donna

An AI-assisted job search copilot, from finding roles to landing the offer. Donna drafts and recommends; **you review and submit everything**. It never auto-applies, never sends email, and never scrapes sites that forbid it.

## Meet Donna

- **Voice-led onboarding.** Donna greets you, asks your name, connects your AI key, then reads your CV (PDF, DOCX or text), a LinkedIn PDF export and your website, and builds your profile. Voice is free (browser), premium (OpenAI) or custom (pre-rendered clips or your own server). See `docs/VOICE.md`.
- **A real profile, not a text blob.** Roles, achievements, projects, education and skills are separate components you edit in place, laid out like read.cv. Preview it, or export it as a standalone HTML page. A shareable public link is planned (the `handle` field is reserved).

## What it does

| Stage | Feature | Borrowed from |
|---|---|---|
| Find | Paste link/text, official Greenhouse/Lever/Ashby/RemoteOK feeds, job-alert email import, one-click bookmarklet | career-ops (portals), ai-job-search (scrape + dedupe) |
| Fit | 1-5 score across 5 dimensions, deal-breaker vetoes, legitimacy observations, gaps | career-ops (A-H eval), ai-job-search (dimensions, vetoes) |
| Tailor | CV + cover letter from your master CV only, separate reviewer pass that fact-checks, unsupported keywords listed as gaps | ai-job-search (drafter/reviewer), career-ops (never fabricate) |
| Export | PDF (default), Word, Markdown; 3 templates; switch any time after generation | - |
| Apply | Answer bank + AI drafted answers to form questions; you click submit | Auto_job_applier (answer bank, dry-run spirit) |
| Track | Board/table pipeline, statuses, follow-up reminders | career-ops, ai-job-search |
| Interview | Prep pack, STAR+R story bank, recruiter/follow-up/thank-you drafts | career-ops, ai-job-search |

Bring your own key: Anthropic, OpenAI, or any OpenAI-compatible endpoint (OpenRouter, Groq, ...). All AI calls go through one interface (`src/lib/ai.ts`), so a hosted "full service" tier can be added later as another provider.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test
```

Then: **Settings** (add key) → **Profile** (paste CV) → **Add jobs**.

## Deploy free on Vercel

1. Push this repo to GitHub (private is fine).
2. On vercel.com: **Add New → Project → import the repo → Deploy**. No environment variables needed.
3. Your app is live at `https://<project>.vercel.app`.

Note: the Hobby plan is for non-commercial use. Move to Pro when this becomes a paid product.

## Data and privacy (v1)

Data is stored in your browser's localStorage (back it up from Settings). Your API key stays in the browser and is relayed per request by `/api/ai`, which does not store or log it. Persistence is isolated in `src/lib/store.tsx`; `supabase/schema.sql` is the schema (with row level security) for the planned move to Supabase.

## Safety choices

- LinkedIn/Indeed/Glassdoor are never fetched server-side; paste or use the bookmarklet in your own session.
- Server fetches block private/internal addresses (SSRF guard).
- Faithfulness rules in every prompt: reformulate, never invent.

## Roadmap

0. Public shareable profile at a handle (needs accounts)

1. Supabase auth + sync (schema ready)
2. Hosted "full service" AI tier and billing
3. Gmail/Notion sync, reply classification, funnel analytics (career-ops, ai-job-search)
4. Browser extension for form-fill assist (user clicks submit)
5. Import your Claude project's prompts and rules (`src/lib/prompts.ts`)
