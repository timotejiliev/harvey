"use client";
import { useEffect, useState } from "react";
import { useStore, uid } from "@/lib/store";
import { askJson } from "@/lib/client-ai";
import { extractPrompt } from "@/lib/prompts";
import type { Job, Settings } from "@/lib/types";
import { Field, useAction } from "./ui";

type Mode = "url" | "text" | "feed" | "email" | "bookmarklet";
const MODES: [Mode, string][] = [["url", "Paste link"], ["text", "Paste text"], ["feed", "Company job boards"], ["email", "Job alert email"], ["bookmarklet", "Bookmarklet"]];

interface Prefill { url?: string; title?: string; text?: string }

export default function AddJob({ done, prefill }: { done: (id?: string) => void; prefill?: Prefill }) {
  const { data, update } = useStore();
  const [mode, setMode] = useState<Mode>(prefill?.text ? "text" : "url");
  const [url, setUrl] = useState(prefill?.url ?? "");
  const [text, setText] = useState(prefill?.text ?? "");
  const { busy, error, run, setError } = useAction();

  useEffect(() => { if (prefill?.text) { setMode("text"); setText(prefill.text); setUrl(prefill.url ?? ""); } }, [prefill]);

  const create = (j: Partial<Job>, source: string): Job => ({
    id: uid(), title: "", company: "", location: "", url: "", description: "", source, status: "Saved",
    notes: "", followUpDate: "", createdAt: new Date().toISOString(), appliedAt: "", ...j,
  });
  const save = (jobs: Job[]) => update((d) => ({ ...d, jobs: [...jobs, ...d.jobs] }));

  const addFromText = (raw: string, source: string, link: string) =>
    run("add", async () => {
      const x = await askJson<{ title: string; company: string; location: string; description: string }>(data.settings, extractPrompt(raw));
      const job = create({ ...x, url: link, description: x.description || raw }, source);
      save([job]);
      done(job.id);
    });

  const fromUrl = () =>
    run("add", async () => {
      const r = await fetch("/api/fetch-job", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      const x = await askJson<{ title: string; company: string; location: string; description: string }>(data.settings, extractPrompt(b.text));
      const job = create({ ...x, title: x.title || b.title || "", company: x.company || b.company || "", url, description: x.description || b.text }, "url");
      save([job]);
      done(job.id);
    });

  return (
    <>
      <h1>Add jobs</h1>
      <p className="sub">Only methods that do not risk your accounts. Harvey never scrapes LinkedIn or Indeed; paste or use the bookmarklet for those.</p>
      <div className="tabs">{MODES.map(([m, l]) => <button key={m} className={mode === m ? "on" : ""} onClick={() => { setMode(m); setError(""); }}>{l}</button>)}</div>
      {error && <div className="err">{error}</div>}
      {mode === "url" && (
        <div className="card">
          <Field label="Job posting URL (company career pages, Greenhouse, Lever, Ashby and similar)"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></Field>
          <div style={{ marginTop: 12 }}><button className="btn" disabled={!url || !!busy} onClick={fromUrl}>{busy ? "Reading..." : "Add job"}</button></div>
        </div>
      )}
      {mode === "text" && (
        <div className="card">
          <Field label="Posting text"><textarea style={{ minHeight: 240 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full job description" /></Field>
          <Field label="Link (optional)"><input value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
          <div style={{ marginTop: 12 }}><button className="btn" disabled={text.length < 40 || !!busy} onClick={() => addFromText(text, "paste", url)}>{busy ? "Reading..." : "Add job"}</button></div>
        </div>
      )}
      {mode === "feed" && <Feeds onAdd={(jobs) => { save(jobs.map((j) => create(j, "feed"))); done(); }} />}
      {mode === "email" && <EmailImport settings={data.settings} busy={!!busy} run={run} onJobs={(jobs) => { save(jobs.map((j) => create(j, "email"))); done(); }} />}
      {mode === "bookmarklet" && <Bookmarklet />}
    </>
  );
  }

function EmailImport({ settings, busy, run, onJobs }: { settings: Settings; busy: boolean; run: <T>(l: string, f: () => Promise<T>) => Promise<T | undefined>; onJobs: (j: Partial<Job>[]) => void }) {
  const [raw, setRaw] = useState("");
  const go = () =>
    run("email", async () => {
      const out = await askJson<{ jobs: { title: string; company: string; location: string; url: string }[] }>(settings, {
        system: "Extract job listings from a job-alert email. Reply with JSON only.",
        prompt: `Reply as {"jobs":[{"title":s,"company":s,"location":s,"url":s}]}. Only include real listings with their direct links.\n\n${raw.slice(0, 30000)}`,
      });
      onJobs(out.jobs);
    });
  return (
    <div className="card">
      <p className="muted small">Paste the body of a job-alert email (LinkedIn, Indeed, Otta, etc.). Harvey lists the roles; the full text is fetched when you evaluate each one, or paste it yourself.</p>
      <Field label="Email text"><textarea style={{ minHeight: 220 }} value={raw} onChange={(e) => setRaw(e.target.value)} /></Field>
      <div style={{ marginTop: 12 }}><button className="btn" disabled={raw.length < 40 || busy} onClick={go}>{busy ? "Reading..." : "Extract jobs"}</button></div>
    </div>
  );
}

function Feeds({ onAdd }: { onAdd: (j: Partial<Job>[]) => void }) {
  const [kind, setKind] = useState("greenhouse");
  const [slug, setSlug] = useState("");
  const [filter, setFilter] = useState("");
  const [jobs, setJobs] = useState<Partial<Job>[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const { busy, error, run } = useAction();
  const load = () => run("feed", async () => {
    const r = await fetch("/api/feeds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, slug }) });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error);
    setJobs(b.jobs); setPicked(new Set());
  });
  const shown = jobs.map((j, i) => ({ j, i })).filter(({ j }) => !filter || `${j.title} ${j.location}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="card">
      <p className="muted small">Uses the official public job-board APIs of Greenhouse, Lever and Ashby (company slug is in the board URL, e.g. boards.greenhouse.io/<b>anthropic</b>) and RemoteOK.</p>
      <div className="row">
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 160 }}><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="remoteok">RemoteOK</option></select>
        {kind !== "remoteok" && <input className="grow" placeholder="company slug" value={slug} onChange={(e) => setSlug(e.target.value)} />}
        <button className="btn" onClick={load} disabled={!!busy || (kind !== "remoteok" && !slug)}>{busy ? "Loading..." : "Load jobs"}</button>
      </div>
      {error && <div className="err">{error}</div>}
      {jobs.length > 0 && (
        <>
          <div className="row" style={{ margin: "12px 0" }}>
            <input className="grow" placeholder="Filter by title or location" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <button className="btn" disabled={picked.size === 0} onClick={() => onAdd([...picked].map((i) => jobs[i]))}>Add {picked.size} selected</button>
          </div>
          <div style={{ maxHeight: 380, overflow: "auto" }}>
            {shown.map(({ j, i }) => (
              <label key={i} style={{ display: "flex", gap: 8, fontWeight: 400, margin: "4px 0" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={picked.has(i)} onChange={(e) => { const n = new Set(picked); e.target.checked ? n.add(i) : n.delete(i); setPicked(n); }} />
                <span><b>{j.title}</b> <span className="muted">{j.company} · {j.location}</span></span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Bookmarklet() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const code = `javascript:(function(){var A='${origin}';var w=window.open(A+'/?bm=1');function h(e){if(e.origin===A&&e.data==='harvey-ready'){w.postMessage({harvey:1,url:location.href,title:document.title,text:(String(getSelection())||document.body.innerText).slice(0,40000)},A);removeEventListener('message',h)}}addEventListener('message',h)})()`;
  return (
    <div className="card">
      <p>Drag this button to your bookmarks bar. On any job page, click it to send the posting (or your selected text) to Harvey for review.</p>
      <p><a className="btn" href={code} onClick={(e) => e.preventDefault()} draggable>Send to Harvey</a></p>
      <p className="muted small">It runs in your own browser on a page you are already viewing, so it doesn&apos;t scrape or automate any site. Some sites with strict security policies may block it; select the text and paste instead.</p>
    </div>
  );
}
