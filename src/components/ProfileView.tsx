"use client";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { Field } from "./ui";

export default function ProfileView() {
  const { data, update } = useStore();
  const p = data.profile;
  const set = (patch: Partial<Profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  return (
    <>
      <h1>Profile</h1>
      <p className="sub">Your master CV is the single source of truth. Every tailored document is built only from what is here, so it never invents experience.</p>
      <div className="card">
        <div className="grid2">
          <Field label="Full name"><input value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Email"><input value={p.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Phone"><input value={p.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Location"><input value={p.location} onChange={(e) => set({ location: e.target.value })} /></Field>
        </div>
        <Field label="Links (LinkedIn, GitHub, portfolio; one per line)"><textarea style={{ minHeight: 70 }} value={p.links} onChange={(e) => set({ links: e.target.value })} /></Field>
      </div>
      <div className="card">
        <Field label="Master CV (markdown or plain text; include everything, the AI will select)">
          <textarea className="mono" style={{ minHeight: 320 }} value={p.masterCv} onChange={(e) => set({ masterCv: e.target.value })} placeholder={"# Your Name\n\n## Experience\n### Company, Title | 2021-2024\n- Achievement with a real number\n..."} />
        </Field>
        <Field label="Extra proof points & context (projects, metrics, things not on the CV)">
          <textarea value={p.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
      <div className="card">
        <Field label="Target roles"><input value={p.targetRoles} onChange={(e) => set({ targetRoles: e.target.value })} placeholder="e.g. Senior Product Manager, Growth PM" /></Field>
        <Field label="Deal-breakers (one per line; a hit forces a skip)">
          <textarea value={p.dealBreakers} onChange={(e) => set({ dealBreakers: e.target.value })} placeholder={"No visa sponsorship\nOn-site only outside my city\nSalary below X"} />
        </Field>
        <Field label={`Advise against applying below score: ${p.minScore.toFixed(1)}`}>
          <input type="range" min={1} max={5} step={0.5} value={p.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} />
        </Field>
      </div>
    </>
  );
}
