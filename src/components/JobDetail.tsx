"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ask, askJson } from "@/lib/client-ai";
import { answerPrompt, draftPrompt, evaluatePrompt, extractPrompt, outreachPrompt, prepPrompt, reviewPrompt } from "@/lib/prompts";
import { exportDoc } from "@/lib/export";
import { TEMPLATES } from "@/lib/templates";
import { STATUSES, type Documents, type Evaluation, type ExportFormat, type Job, type Status, type TemplateId } from "@/lib/types";
import { Field, Md, Score, scoreClass, useAction } from "./ui";

type Tab = "fit" | "docs" | "apply" | "prep" | "outreach" | "notes";

export default function JobDetail({ id, back }: { id: string; back: () => void }) {
  const { data, update } = useStore();
  const job = data.jobs.find((j) => j.id === id);
  const [tab, setTab] = useState<Tab>("fit");
  const { busy, error, run } = useAction();
  if (!job) return <div className="card empty">Job not found. <button className="btn ghost" onClick={back}>Back</button></div>;

  const { settings, profile } = data;
  const patch = (p: Partial<Job>) => update((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) }));
  const needProfile = !profile.masterCv.trim();

  /** Make sure the description exists; fetch from URL when only a link was imported. */
  async function ensureDescription(): Promise<Job> {
    if (job!.description.trim().length >= 30) return job!;
    if (!job!.url) throw new Error("This job has no description. Paste it in the Notes tab or edit the job.");
    const r = await fetch("/api/fetch-job", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: job!.url }) });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error + " (then paste the text into 'Description' under Notes)");
    const x = await askJson<{ description: string }>(settings, extractPrompt(b.text));
    const next = { ...job!, description: x.description || b.text };
    patch({ description: next.description });
    return next;
  }

  const evaluate = () => run("evaluate", async () => {
    const j = await ensureDescription();
    const ev = await askJson<Omit<Evaluation, "at">>(settings, evaluatePrompt(profile, j));
    patch({ evaluation: { ...ev, at: new Date().toISOString() }, status: job.status === "Saved" ? "Evaluated" : job.status });
  });

  const generateDocs = () => run("docs", async () => {
    const j = await ensureDescription();
    const withEval = { ...j, evaluation: job.evaluation };
    let draft = await askJson<{ cv: string; coverLetter: string; unsupportedKeywords: string[] }>(settings, draftPrompt(profile, withEval));
    // Separate reviewer pass (fresh context) checks for fabrication; revise once if needed.
    let review = await askJson<{ verdict: string; feedback: string; fabrications: string[] }>(settings, reviewPrompt(profile, j, draft.cv, draft.coverLetter));
    if (review.verdict === "revise" || review.fabrications?.length) {
      draft = await askJson(settings, draftPrompt(profile, withEval, `${review.feedback}\nRemove any unsupported claims: ${(review.fabrications ?? []).join("; ")}`));
      review = await askJson(settings, reviewPrompt(profile, j, draft.cv, draft.coverLetter));
    }
    const note = [review.fabrications?.length ? `Possible unsupported claims: ${review.fabrications.join("; ")}` : "No unsupported claims found.", review.feedback].filter(Boolean).join("\n\n");
    patch({
      documents: { cv: draft.cv, coverLetter: draft.coverLetter, review: note, unsupportedKeywords: draft.unsupportedKeywords ?? [], template: job.documents?.template ?? settings.defaultTemplate, at: new Date().toISOString() },
      status: ["Saved", "Evaluated"].includes(job.status) ? "Ready to apply" : job.status,
    });
    setTab("docs");
  });

  const prep = () => run("prep", async () => {
    const j = await ensureDescription();
    const stories = data.stories.map((s) => `${s.title}: S=${s.situation} A=${s.action} R=${s.result}`).join("\n");
    patch({ prep: await ask(settings, prepPrompt(profile, j, stories)) });
  });

  const setStatus = (s: Status) => {
    const p: Partial<Job> = { status: s };
    if (s === "Applied" && !job.appliedAt) {
      p.appliedAt = new Date().toISOString().slice(0, 10);
      if (!job.followUpDate) p.followUpDate = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    }
    patch(p);
  };

  const tabs: [Tab, string][] = [["fit", "Fit"], ["docs", "Documents"], ["apply", "Apply"], ["prep", "Interview prep"], ["outreach", "Outreach"], ["notes", "Notes & details"]];

  return (
    <>
      <button className="btn ghost back" onClick={back}>← Pipeline</button>
      <div className="page-head">
        <div>
          <h1>{job.title || "Untitled role"}</h1>
          <p className="sub">{job.company}{job.location ? ` · ${job.location}` : ""} {job.url && <a href={job.url} target="_blank" rel="noreferrer">posting ↗</a>}</p>
        </div>
        <div className="row">
          <Score value={job.evaluation?.score} />
          <select value={job.status} onChange={(e) => setStatus(e.target.value as Status)} style={{ width: 180, borderRadius: 999 }}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      {needProfile && <div className="banner">Add your master CV in <b>Profile</b> first. Everything is built from it.</div>}
      {!settings.apiKey && settings.provider !== "openai-compatible" && <div className="banner">Add your AI key in <b>Settings</b> to use AI features.</div>}
      {error && <div className="err">{error}</div>}
      <div className="tabs">{tabs.map(([t, l]) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{l}</button>)}</div>

      {tab === "fit" && (
        <>
          <div className="row"><button className="btn" disabled={!!busy || needProfile} onClick={evaluate}>{busy === "evaluate" ? "Evaluating..." : job.evaluation ? "Re-evaluate" : "Evaluate fit"}</button></div>
          {job.evaluation && <EvalView ev={job.evaluation} min={profile.minScore} />}
        </>
      )}

      {tab === "docs" && (
        <>
          <div className="row"><button className="btn" disabled={!!busy || needProfile} onClick={generateDocs}>{busy === "docs" ? "Drafting and fact-checking..." : job.documents ? "Regenerate" : "Generate tailored CV & cover letter"}</button></div>
          <p className="muted small">Drafted from your master CV only, then checked by a separate reviewer pass for anything unsupported. You review and edit before using.</p>
          {job.documents && <DocsEditor job={job} docs={job.documents} patch={(d) => patch({ documents: d })} defaultFormat={settings.defaultFormat} />}
        </>
      )}

      {tab === "apply" && <ApplyAssist job={job} />}

      {tab === "prep" && (
        <>
          <div className="row"><button className="btn" disabled={!!busy || needProfile} onClick={prep}>{busy === "prep" ? "Preparing..." : job.prep ? "Regenerate" : "Generate prep pack"}</button></div>
          {job.prep && <div className="card"><Md text={job.prep} /></div>}
        </>
      )}

      {tab === "outreach" && <Outreach job={job} patch={patch} needProfile={needProfile} />}

      {tab === "notes" && (
        <div className="card">
          <div className="grid2">
            <Field label="Title"><input value={job.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
            <Field label="Company"><input value={job.company} onChange={(e) => patch({ company: e.target.value })} /></Field>
            <Field label="Location"><input value={job.location} onChange={(e) => patch({ location: e.target.value })} /></Field>
            <Field label="URL"><input value={job.url} onChange={(e) => patch({ url: e.target.value })} /></Field>
            <Field label="Follow-up date"><input type="date" value={job.followUpDate} onChange={(e) => patch({ followUpDate: e.target.value })} /></Field>
            <Field label="Applied on"><input type="date" value={job.appliedAt} onChange={(e) => patch({ appliedAt: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea value={job.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field>
          <Field label="Job description"><textarea className="mono" style={{ minHeight: 260 }} value={job.description} onChange={(e) => patch({ description: e.target.value })} /></Field>
          <div style={{ marginTop: 14 }}>
            <button className="btn danger" onClick={() => { if (confirm("Delete this job?")) { update((d) => ({ ...d, jobs: d.jobs.filter((j) => j.id !== id) })); back(); } }}>Delete job</button>
          </div>
        </div>
      )}
    </>
  );
}

function EvalView({ ev, min }: { ev: Evaluation; min: number }) {
  const rec = ev.score < min && ev.recommendation === "apply" ? "consider" : ev.recommendation;
  return (
    <>
      <div className="card">
        <div className="row"><span className={`score big-score ${scoreClass(ev.score)}`}>{ev.score.toFixed(1)}</span><span className="pill">{rec === "apply" ? "Worth applying" : rec === "consider" ? "Consider carefully" : "Skip"}</span>
          {ev.score < min && <span className="muted small">below your {min.toFixed(1)} threshold (you can still apply)</span>}</div>
        <p>{ev.summary}</p>
        {ev.dealBreakerHits.length > 0 && <div className="err"><b>Deal-breakers hit:</b> {ev.dealBreakerHits.join("; ")}</div>}
      </div>
      <div className="card"><table><tbody>{ev.dimensions.map((d) => <tr key={d.name}><td style={{ width: 190 }}><b>{d.name}</b></td><td style={{ width: 60 }}><span className={`score ${scoreClass(d.score)}`}>{d.score.toFixed(1)}</span></td><td>{d.rationale}</td></tr>)}</tbody></table></div>
      <div className="grid2">
        <div className="card"><h3>Strengths</h3><ul>{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        <div className="card"><h3>Gaps</h3><ul>{ev.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
      </div>
      {(ev.legitimacyFlags.length > 0 || ev.salaryNote) && (
        <div className="card">
          {ev.legitimacyFlags.length > 0 && <><h3>Legitimacy observations</h3><ul>{ev.legitimacyFlags.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
          {ev.salaryNote && <><h3>Compensation</h3><p>{ev.salaryNote}</p></>}
        </div>
      )}
    </>
  );
}

function DocsEditor({ job, docs, patch, defaultFormat }: { job: Job; docs: Documents; patch: (d: Documents) => void; defaultFormat: ExportFormat }) {
  const [which, setWhich] = useState<"cv" | "coverLetter">("cv");
  const [fmt, setFmt] = useState<ExportFormat>(defaultFormat);
  const [preview, setPreview] = useState(true);
  const text = which === "cv" ? docs.cv : docs.coverLetter;
  const name = `${which === "cv" ? "CV" : "Cover_Letter"}_${job.company}_${job.title}`;
  return (
    <>
      {docs.unsupportedKeywords.length > 0 && <div className="card small"><b>Keywords the job wants that your materials don&apos;t support (not added):</b> {docs.unsupportedKeywords.join(", ")}</div>}
      <div className="card small"><b>Reviewer notes</b><div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{docs.review}</div></div>
      <div className="row" style={{ margin: "10px 0" }}>
        <div className="tabs" style={{ margin: 0, border: 0 }}>
          <button className={which === "cv" ? "on" : ""} onClick={() => setWhich("cv")}>CV</button>
          <button className={which === "coverLetter" ? "on" : ""} onClick={() => setWhich("coverLetter")}>Cover letter</button>
        </div>
        <select value={docs.template} onChange={(e) => patch({ ...docs, template: e.target.value as TemplateId })} style={{ width: 130 }}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select value={fmt} onChange={(e) => setFmt(e.target.value as ExportFormat)} style={{ width: 120 }}><option value="pdf">PDF</option><option value="docx">Word</option><option value="md">Markdown</option></select>
        <button className="btn" onClick={() => exportDoc(text, fmt, docs.template, name)}>Export {fmt.toUpperCase()}</button>
        <button className="btn ghost" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
      </div>
      {fmt === "pdf" && <p className="muted small">PDF opens your browser&apos;s print dialog. Choose &quot;Save as PDF&quot; and turn off headers and footers.</p>}
      {preview ? (
        <div className="card"><Md text={text} /></div>
      ) : (
        <textarea className="mono" style={{ minHeight: 420 }} value={text} onChange={(e) => patch({ ...docs, [which]: e.target.value })} />
      )}
    </>
  );
}

function ApplyAssist({ job }: { job: Job }) {
  const { data, update } = useStore();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const { busy, error, run } = useAction();
  const saved = data.answers.map((x) => `Q: ${x.question}\nA: ${x.answer}`).join("\n\n");
  return (
    <>
      <div className="card">
        <p><b>You submit every application yourself.</b> Harvey prepares everything so applying takes a minute.</p>
        <ol>
          <li>Export your CV and cover letter from the Documents tab.</li>
          <li>Open the posting{job.url ? <> (<a href={job.url} target="_blank" rel="noreferrer">link</a>)</> : ""} and answer form questions below.</li>
          <li>After submitting, set the status to <b>Applied</b>; a follow-up reminder is added for 7 days later.</li>
        </ol>
      </div>
      <div className="card">
        <Field label="Paste an application question"><textarea style={{ minHeight: 80 }} value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" disabled={!q || !!busy} onClick={() => run("a", async () => setA(await ask(data.settings, answerPrompt(data.profile, job, q, saved))))}>{busy ? "Thinking..." : "Draft answer"}</button>
          {a && <button className="btn ghost" onClick={() => update((d) => ({ ...d, answers: [{ id: Math.random().toString(36).slice(2), question: q, answer: a }, ...d.answers] }))}>Save to answer bank</button>}
        </div>
        {error && <div className="err">{error}</div>}
        {a && <textarea style={{ marginTop: 10, minHeight: 140 }} value={a} onChange={(e) => setA(e.target.value)} />}
      </div>
    </>
  );
}

const OUTREACH = [
  "a short message to the recruiter or hiring manager introducing the candidate for this role",
  "a LinkedIn connection request note (under 300 characters) to someone at the company",
  "a follow-up email one week after applying",
  "a thank-you email after an interview",
];
const OUTREACH_LABELS = ["Recruiter message", "Connection note", "Follow-up after applying", "Thank-you after interview"];

function Outreach({ job, patch, needProfile }: { job: Job; patch: (p: Partial<Job>) => void; needProfile: boolean }) {
  const { data } = useStore();
  const { busy, error, run } = useAction();
  return (
    <>
      <div className="row">
        {OUTREACH.map((k, i) => (
          <button key={i} className="btn ghost" disabled={!!busy || needProfile} onClick={() => run("o" + i, async () => {
            const t = await ask(data.settings, outreachPrompt(data.profile, job, k));
            patch({ outreach: `## ${OUTREACH_LABELS[i]}\n\n${t}\n\n${job.outreach ?? ""}` });
          })}>{busy === "o" + i ? "Drafting..." : OUTREACH_LABELS[i]}</button>
        ))}
      </div>
      <p className="muted small">Drafts only. Harvey never sends anything.</p>
      {error && <div className="err">{error}</div>}
      {job.outreach && <div className="card"><Md text={job.outreach} /></div>}
    </>
  );
}
