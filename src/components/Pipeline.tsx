"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { STATUSES, type Job } from "@/lib/types";
import { greeting, pipelineLine } from "@/lib/donna";
import { Score } from "./ui";

export default function Pipeline({ open, goAdd }: { open: (id: string) => void; goAdd: () => void }) {
  const { data } = useStore();
  const [view, setView] = useState<"board" | "table">("board");
  const jobs = data.jobs;
  const today = new Date().toISOString().slice(0, 10);
  const due = jobs.filter((j) => j.followUpDate && j.followUpDate <= today && !["Rejected", "Withdrawn", "Offer"].includes(j.status));
  const applied = jobs.filter((j) => ["Applied", "Interviewing", "Offer"].includes(j.status)).length;

  const evaluating = jobs.filter((j) => ["Saved", "Evaluated", "Ready to apply"].includes(j.status)).length;
  const interviewing = jobs.filter((j) => j.status === "Interviewing").length;
  const offers = jobs.filter((j) => j.status === "Offer").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting(data.profile.name)}</h1>
          <p className="sub donna-line">{pipelineLine({ jobs: jobs.length, due: due.length, ready: jobs.filter((j) => j.status === "Ready to apply").length })}</p>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => setView(view === "board" ? "table" : "board")}>{view === "board" ? "Table view" : "Board view"}</button>
          <button className="btn" onClick={goAdd}>Add jobs</button>
        </div>
      </div>
      {jobs.length > 0 && (
        <div className="stats">
          <div className="stat"><b>{evaluating}</b><span>To work on</span></div>
          <div className="stat"><b>{applied}</b><span>Applied</span></div>
          <div className="stat"><b>{interviewing}</b><span>Interviewing</span></div>
          <div className="stat"><b>{offers}</b><span>Offers</span></div>
        </div>
      )}
      {due.length > 0 && (
        <div className="banner"><b>Follow-ups due</b>
          {due.map((j) => <a key={j.id} href="#" onClick={(e) => { e.preventDefault(); open(j.id); }}>{j.company} · {j.followUpDate}</a>)}
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="card empty">
          <b>No jobs yet</b>
          Paste a link or the text of a posting and Donna will score it against your CV.
          <div style={{ marginTop: 22 }}><button className="btn" onClick={goAdd}>Add your first job</button></div>
        </div>
      ) : view === "board" ? (
        <div className="board">
          {STATUSES.map((st) => (
            <div className="col" key={st}>
              <h3><span className="dot" style={{ background: DOT[st] }} />{st}<em>{jobs.filter((j) => j.status === st).length}</em></h3>
              {jobs.filter((j) => j.status === st).sort(byScore).map((j) => <Card key={j.id} j={j} open={open} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 12 }}>
          <table>
            <thead><tr><th>Company</th><th>Role</th><th>Fit</th><th>Status</th><th>Follow-up</th></tr></thead>
            <tbody>
              {[...jobs].sort(byScore).map((j) => (
                <tr className="click" key={j.id} onClick={() => open(j.id)}>
                  <td><b>{j.company}</b></td><td>{j.title}</td><td><Score value={j.evaluation?.score} /></td><td>{j.status}</td><td className="muted">{j.followUpDate || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const DOT: Record<string, string> = {
  Saved: "var(--ink-3)", Evaluated: "var(--warn)", "Ready to apply": "var(--accent)", Applied: "var(--ink)",
  Interviewing: "var(--good)", Offer: "var(--good)", Rejected: "var(--bad)", Withdrawn: "var(--ink-3)",
};

const byScore = (a: Job, b: Job) => (b.evaluation?.score ?? 0) - (a.evaluation?.score ?? 0);

function Card({ j, open }: { j: Job; open: (id: string) => void }) {
  return (
    <div className="jc" onClick={() => open(j.id)}>
      <div className="jc-top">
        <div className="avatar">{(j.company || "?").charAt(0).toUpperCase()}</div>
        <div><b>{j.title || "Untitled role"}</b><span className="jc-co">{j.company}{j.location ? ` · ${j.location}` : ""}</span></div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Score value={j.evaluation?.score} />
        {j.documents && <span className="pill">Docs ready</span>}
        {j.evaluation && j.evaluation.dealBreakerHits.length > 0 && <span className="pill s-lo">Deal-breaker</span>}
      </div>
    </div>
  );
}
