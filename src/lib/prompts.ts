import { profileToMarkdown } from "./profile";
import type { Job, Profile } from "./types";

export const FAITHFULNESS = `Hard rules:
- Never invent employers, titles, dates, degrees, metrics, tools or achievements. Only reformulate what is in the candidate's materials.
- You may reorder, emphasise, and rephrase using the job's vocabulary when it is truthful.
- If the job asks for something the candidate materials do not support, list it as a gap. Do not add it.`;

const profileBlock = (p: Profile) =>
  `CANDIDATE
Name: ${p.name}
Location: ${p.location}
Target roles: ${p.targetRoles}
Deal-breakers:\n${p.dealBreakers || "(none)"}
Extra notes / proof points:\n${p.notes || "(none)"}

MASTER CV (source of truth):\n${profileToMarkdown(p)}`;

const jobBlock = (j: Job) =>
  `JOB
Title: ${j.title}\nCompany: ${j.company}\nLocation: ${j.location}\nURL: ${j.url}\n\nDescription:\n${j.description}`;

export const extractPrompt = (raw: string) => ({
  system: "You extract structured fields from job postings. Reply with JSON only.",
  prompt: `Extract from this job posting text. Reply as JSON: {"title": string, "company": string, "location": string, "description": string}. "description" is the cleaned posting text (responsibilities, requirements, benefits, salary if present) without navigation or boilerplate. Use "" for unknown fields.\n\nTEXT:\n${raw.slice(0, 30000)}`,
});

export const evaluatePrompt = (p: Profile, j: Job) => ({
  system: `You are a rigorous, honest career advisor evaluating job fit. You score against the candidate's actual materials, not wishful thinking. Reply with JSON only.`,
  prompt: `${profileBlock(p)}\n\n${jobBlock(j)}\n\nEvaluate fit. Reply as JSON:
{
 "score": number 1-5 (one decimal; 5 = excellent fit),
 "recommendation": "apply" | "consider" | "skip",
 "summary": string (2-3 sentences, include role archetype and seniority level),
 "dimensions": [ {"name":"Skills","score":n,"rationale":s}, {"name":"Experience","score":n,"rationale":s}, {"name":"Culture & values","score":n,"rationale":s}, {"name":"Location & logistics","score":n,"rationale":s}, {"name":"Career alignment","score":n,"rationale":s} ],
 "strengths": [string],
 "gaps": [string] (requirements the candidate does not clearly meet),
 "dealBreakerHits": [string] (candidate deal-breakers this job triggers; empty if none),
 "legitimacyFlags": [string] (vague/duplicated/ghost-job/too-good-to-be-true signals; empty if none),
 "salaryNote": string (stated range, or what to research; "" if nothing)
}
Rules: any deal-breaker hit caps the score at 2 and recommends "skip". Explicit no-sponsorship language when the candidate needs sponsorship is a deal-breaker. Treat legitimacy flags as observations, not verdicts. Minimum score to recommend applying: ${p.minScore}.`,
});

export const draftPrompt = (p: Profile, j: Job, feedback?: string) => ({
  system: `You are an expert CV and cover letter writer producing ATS-friendly documents. ${FAITHFULNESS} Reply with JSON only.`,
  prompt: `${profileBlock(p)}\n\n${jobBlock(j)}\n\n${
    j.evaluation ? `Known gaps from evaluation: ${j.evaluation.gaps.join("; ")}\n\n` : ""
  }${feedback ? `Reviewer feedback to address:\n${feedback}\n\n` : ""}Write a tailored CV and a one-page cover letter. Reply as JSON:
{"cv": string, "coverLetter": string, "unsupportedKeywords": [string]}
CV format (markdown): "# Name", a contact line, "## Summary", "## Experience" (### Company — Title | dates, then "- " bullets), "## Education", "## Skills". Aim for two pages max; cut least relevant lines. Cover letter: plain paragraphs, specific to this company and role, no clichés. "unsupportedKeywords" lists job keywords you could not truthfully include.`,
});

export const reviewPrompt = (p: Profile, j: Job, cv: string, cover: string) => ({
  system: `You are a skeptical hiring reviewer and fact-checker. Reply with JSON only.`,
  prompt: `${profileBlock(p)}\n\n${jobBlock(j)}\n\nDRAFT CV:\n${cv}\n\nDRAFT COVER LETTER:\n${cover}\n\nCheck the drafts. Reply as JSON: {"fabrications": [string] (any claim not supported by the master CV/notes), "weaknesses": [string], "keywordGaps": [string], "verdict": "ok" | "revise", "feedback": string (concrete edits)}. Be strict about fabrications.`,
});

export const prepPrompt = (p: Profile, j: Job, stories: string) => ({
  system: "You are an interview coach. Be specific and practical. Reply in markdown.",
  prompt: `${profileBlock(p)}\n\n${jobBlock(j)}\n\nCandidate story bank:\n${stories || "(empty)"}\n\nProduce an interview prep pack in markdown with sections: ## Company & role snapshot, ## Likely interview stages, ## Likely questions (with which story to use, or "needs a story"), ## Questions to ask them, ## Risks to address (gaps), ## Salary & negotiation notes. Do not invent facts about the company; say what to research.`,
});

export const outreachPrompt = (p: Profile, j: Job, kind: string) => ({
  system: `You write short, human, non-pushy professional messages. ${FAITHFULNESS} Drafts are never sent automatically. Reply in markdown.`,
  prompt: `${profileBlock(p)}\n\n${jobBlock(j)}\n\nWrite: ${kind}. Provide 2 variants, each under 120 words, plus a subject line where relevant.`,
});

export const answerPrompt = (p: Profile, j: Job | null, question: string, saved: string) => ({
  system: `You answer job application form questions truthfully from the candidate's materials. ${FAITHFULNESS} If the answer is not in the materials, say what information is needed instead of guessing.`,
  prompt: `${profileBlock(p)}\n\nSaved answers:\n${saved || "(none)"}\n\n${j ? jobBlock(j) : ""}\n\nQuestion: ${question}\n\nGive a concise answer ready to paste.`,
});

export const parseCvPrompt = (text: string) => ({
  system: "You convert resumes and profile text into structured data. Extract only what is present. Never invent. Reply with JSON only.",
  prompt: `Convert the following material (a CV, LinkedIn export, and/or personal website text) into structured JSON:
{
 "name": string, "headline": string (a short professional headline; derive from the latest title if absent), "email": string, "phone": string, "location": string,
 "about": string (summary paragraph, from the text if present),
 "links": [{"label": string, "url": string}],
 "experience": [{"company": string, "title": string, "location": string, "start": "YYYY-MM" or "YYYY", "end": "YYYY-MM" or "YYYY" or "", "current": boolean, "description": string (one sentence of scope, only if the text gives it), "highlights": [string] (bullets, lightly cleaned, keep numbers exactly)}],
 "education": [{"school": string, "degree": string, "field": string, "start": string, "end": string, "notes": string}],
 "achievements": [{"title": string, "metric": string (e.g. "+38%", "$1.2M", "team of 12"), "detail": string, "year": string}] (the 3-8 most impressive quantified or standout results found in the text, each a short title),
 "projects": [{"name": string, "url": string, "description": string}],
 "skills": [string], "languages": [string], "certifications": [string]
}
Use "" or [] for anything missing. Newest experience first.

MATERIAL:
${text.slice(0, 60000)}`,
});
