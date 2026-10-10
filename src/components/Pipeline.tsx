"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { STATUSES, type Job } from "@/lib/types";
import { Score } from "./ui";

export default function Pipeline({ open, goAdd }: { open: (id: string) => void; goAdd: () => void }) {
  const { data } = useStore();
  const [view, setView] = useState<"board" | "table">("board");
  const jobs = data.jobs;
  const today = new Date().toISOString().slice(0, 10);
  const due = jobs.filter((j) => j.followUpDate && j.followUpDate <= today && !["Rejected", "Withdrawn", "Offer"].includes(j.status));
  const applied = jobs.filter((j) => ["Applied", "Interviewing", "Offer"].includes(j.status)).length;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h1>Pipeline</h1><p className="sub">{jobs.length} jobs · {applied} applied</p></div>
        <div className="row">
          <button className="btn ghost" onClick={() => setView(view === "board" ? "table" : "board")}>{view === "board" ? "Table view" : "Board view"}</button>
          <button className="btn" onClick={goAdd}>+ Add jobs</button>
        </div>
      </div>
      {due.length > 0 && (
        <div className="banner"><b>Follow-ups due:</b>{" "}
          {due.map((j) => <a key={j.id} href="#" onClick={(e) => { e.preventDefault(); open(j.id); }} style={{ marginRight: 12 }}>{j.company} ({j.followUpDate})</a>)}
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="card empty">No jobs yet. Add a job by pasting a link or its text.<br /><br /><button className="btn" onClick={goAdd}>Add your first job</button></div>
      ) : view === "board" ? (
        <div className="board">
          {STATUSES.map((st) => (
            <div className="col" key={st}>
              <h3>{st} ({jobs.filter((j) => j.status === st).length})</h3>
              {jobs.filter((j) => j.status === st).sort(byScore).map((j) => <Card key={j.id} j={j} open={open} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Company</th><th>Role</th><th>Fit</th><th>Status</th><th>Follow-up</th></tr></thead>
            <tbody>
              {[...jobs].sort(byScore).map((j) => (
                <tr key={j.id} onClick={() => open(j.id)} style={{ cursor: "pointer" }}>
                  <td>{j.company}</td><td>{j.title}</td><td><Score value={j.evaluation?.score} /></td><td>{j.status}</td><td>{j.followUpDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const byScore = (a: Job, b: Job) => (b.evaluation?.score ?? 0) - (a.evaluation?.score ?? 0);

function Card({ j, open }: { j: Job; open: (id: string) => void }) {
  return (
    <div className="jc" onClick={() => open(j.id)}>
      <b>{j.title || "Untitled role"}</b>
      <span className="muted small">{j.company}{j.location ? ` · ${j.location}` : ""}</span>
      <div className="row" style={{ marginTop: 6, gap: 6 }}>
        <Score value={j.evaluation?.score} />
        {j.documents && <span className="pill">docs</span>}
        {j.evaluation && j.evaluation.dealBreakerHits.length > 0 && <span className="pill s-lo">deal-breaker</span>}
      </div>
    </div>
  );
}
