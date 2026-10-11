"use client";
import { useState, type ReactNode } from "react";
import { useStore, uid } from "@/lib/store";
import { fmtRange } from "@/lib/profile";
import { profileHtml } from "@/lib/profile-html";
import type { Achievement, Education, Experience, Profile, Project } from "@/lib/types";

const COVERS = 5;
type ListKey = "experience" | "education" | "achievements" | "projects";

export default function ProfileView({ talk }: { talk: () => void }) {
  const { data, update } = useStore();
  const p = data.profile;
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const editable = !preview;
  const set = (patch: Partial<Profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));

  const save = <T extends { id: string }>(key: ListKey, item: T) => {
    const list = p[key] as unknown as T[];
    set({ [key]: list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list] } as Partial<Profile>);
    setEditing(null);
  };
  const remove = (key: ListKey, id: string) => {
    set({ [key]: (p[key] as unknown as { id: string }[]).filter((x) => x.id !== id) } as Partial<Profile>);
    setEditing(null);
  };
  const add = <T extends { id: string }>(key: ListKey, blank: T) => {
    set({ [key]: [blank, ...(p[key] as unknown as T[])] } as Partial<Profile>);
    setEditing(blank.id);
  };
  const cancel = (key: ListKey, id: string, isBlank: boolean) => {
    if (isBlank) remove(key, id);
    setEditing(null);
  };

  const exportPage = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([profileHtml(p)], { type: "text/html" }));
    a.download = `${(p.name || "profile").replace(/[^a-z0-9]+/gi, "_")}.html`;
    a.click();
  };

  const roleName = (id: string) => { const e = p.experience.find((x) => x.id === id); return e ? `${e.title || "Role"}, ${e.company}` : ""; };

  const onPhoto = (f: File) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const size = 320, c = document.createElement("canvas");
      c.width = c.height = size;
      const m = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      set({ photo: c.toDataURL("image/jpeg", 0.85) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  const startYears = p.experience.map((e) => parseInt(e.start.slice(0, 4), 10)).filter((n) => n > 1960);
  const years = startYears.length ? Math.max(0, new Date().getFullYear() - Math.min(...startYears)) : null;

  return (
    <div className="pf">
      <div className="pf-bar">
        <div className="tabs" style={{ margin: 0 }}>
          <button className={!preview ? "on" : ""} onClick={() => setPreview(false)}>Edit</button>
          <button className={preview ? "on" : ""} onClick={() => { setPreview(true); setEditing(null); }}>Preview</button>
        </div>
        <span className="eyebrow">{preview ? "How others will see it" : "Click anything to edit"}</span>
      </div>

      <div className="bezel"><div className="inner">
        <div className={`pf-cover cv-${p.cover % COVERS}`}>
          {editable && <button className="pf-cover-btn" onClick={() => set({ cover: (p.cover + 1) % COVERS })}>Change cover</button>}
        </div>
        <div className="pf-ident">
          <label className={`pf-photo ${editable ? "can" : ""}`}>
            {p.photo ? <img src={p.photo} alt="" /> : <span>{(p.name || "?").charAt(0).toUpperCase()}</span>}
            {editable && <><input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} /><em>Change</em></>}
          </label>
          <Inline editable={editable} value={p.name} onChange={(v) => set({ name: v })} placeholder="Your name" className="pf-name" />
          <Inline editable={editable} value={p.headline} onChange={(v) => set({ headline: v })} placeholder="Headline, e.g. Product manager building fintech" className="pf-headline" />
          <div className="pf-stats">
            <div><span className="eyebrow">Roles</span><b>{p.experience.length}</b></div>
            <div><span className="eyebrow">Years</span><b>{years ?? "-"}</b></div>
            <div><span className="eyebrow">Results</span><b>{p.achievements.length}</b></div>
            <div><span className="eyebrow">Skills</span><b>{p.skills.length}</b></div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={talk}>Talk to Donna</button>
            <button className="btn ghost" onClick={exportPage}>Export page</button>
            <button className="btn ghost" disabled title="Public links arrive with accounts">Share link</button>
          </div>
          <div className="pf-meta">
            <Inline editable={editable} value={p.location} onChange={(v) => set({ location: v })} placeholder="Location" />
            <Inline editable={editable} value={p.email} onChange={(v) => set({ email: v })} placeholder="Email" />
            <Inline editable={editable} value={p.phone} onChange={(v) => set({ phone: v })} placeholder="Phone" />
          </div>
          <Links p={p} set={set} editable={editable} />
        </div>

      <Section label="About" editable={editable}>
        {editable ? <textarea className="pf-about" value={p.about} onChange={(e) => set({ about: e.target.value })} placeholder="Two or three sentences on what you do and what you want next." /> : p.about ? <p className="pf-text">{p.about}</p> : null}
      </Section>

      <Section label="Experience" editable={editable} onAdd={() => add<Experience>("experience", { id: uid(), company: "", title: "", location: "", start: "", end: "", current: false, description: "", highlights: [] })} empty={p.experience.length === 0 ? "No roles yet. Add one, or let Donna read your CV." : ""}>
        {p.experience.map((e) => editing === e.id ? (
          <ItemForm<Experience> key={e.id} item={e}
            fields={[
              { key: "title", label: "Title", half: true }, { key: "company", label: "Company", half: true },
              { key: "location", label: "Location", half: true }, { key: "start", label: "Start (2021-03)", half: true },
              { key: "end", label: "End (blank if current)", half: true }, { key: "current", label: "I currently work here", kind: "bool", half: true },
              { key: "description", label: "What the role was about", kind: "area" },
              { key: "highlights", label: "Highlights (one per line, include numbers)", kind: "lines" },
            ]}
            onSave={(x) => save("experience", { ...x, end: x.current ? "" : x.end })} onCancel={() => cancel("experience", e.id, !e.company && !e.title)} onDelete={() => remove("experience", e.id)} />
        ) : (
          <div className="pf-item" key={e.id}>
            <div className="avatar">{(e.company || "?").charAt(0).toUpperCase()}</div>
            <div className="pf-main">
              <div className="pf-line"><div><b>{e.title || "Untitled role"}</b> <span className="muted">{e.company}</span></div><span className="date">{fmtRange(e.start, e.end, e.current)}</span></div>
              {e.location && <div className="muted small">{e.location}</div>}
              {e.description && <p className="pf-text">{e.description}</p>}
              {e.highlights.length > 0 && <ul>{e.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
              {editable && <button className="pf-edit" onClick={() => setEditing(e.id)}>Edit</button>}
            </div>
          </div>
        ))}
      </Section>

      <Section label="Achievements" editable={editable} onAdd={() => add<Achievement>("achievements", { id: uid(), title: "", metric: "", detail: "", year: "", experienceId: "" })} empty={p.achievements.length === 0 ? "The results you would put on a billboard." : ""}>
        <div className="pf-wins">
          {p.achievements.map((a) => editing === a.id ? (
            <div key={a.id} style={{ gridColumn: "1 / -1" }}>
              <ItemForm<Achievement> item={a}
                fields={[
                  { key: "metric", label: "Headline number (+38%, $1.2M)", half: true }, { key: "year", label: "Year", half: true },
                  { key: "title", label: "What you achieved" }, { key: "detail", label: "How, and why it mattered", kind: "area" },
                  { key: "experienceId", label: "Which role", kind: "select", options: [{ value: "", label: "Not linked" }, ...p.experience.map((e) => ({ value: e.id, label: `${e.title || "Role"}, ${e.company}` }))] },
                ]}
                onSave={(x) => save("achievements", x)} onCancel={() => cancel("achievements", a.id, !a.title)} onDelete={() => remove("achievements", a.id)} />
            </div>
          ) : (
            <div className="win" key={a.id}>
              {a.metric && <strong>{a.metric}</strong>}
              <b>{a.title}</b>
              {a.detail && <p>{a.detail}</p>}
              <span className="muted small">{[roleName(a.experienceId), a.year].filter(Boolean).join(" · ")}</span>
              {editable && <button className="pf-edit" onClick={() => setEditing(a.id)}>Edit</button>}
            </div>
          ))}
        </div>
      </Section>

      <Section label="Projects" editable={editable} onAdd={() => add<Project>("projects", { id: uid(), name: "", url: "", description: "" })}>
        {p.projects.map((x) => editing === x.id ? (
          <ItemForm<Project> key={x.id} item={x}
            fields={[{ key: "name", label: "Name", half: true }, { key: "url", label: "Link", half: true }, { key: "description", label: "Description", kind: "area" }]}
            onSave={(v) => save("projects", v)} onCancel={() => cancel("projects", x.id, !x.name)} onDelete={() => remove("projects", x.id)} />
        ) : (
          <div className="pf-item" key={x.id}>
            <div className="pf-main">
              <div className="pf-line"><b>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.name}</a> : x.name}</b></div>
              {x.description && <p className="pf-text">{x.description}</p>}
              {editable && <button className="pf-edit" onClick={() => setEditing(x.id)}>Edit</button>}
            </div>
          </div>
        ))}
      </Section>

      <Section label="Education" editable={editable} onAdd={() => add<Education>("education", { id: uid(), school: "", degree: "", field: "", start: "", end: "", notes: "" })}>
        {p.education.map((e) => editing === e.id ? (
          <ItemForm<Education> key={e.id} item={e}
            fields={[{ key: "school", label: "School", half: true }, { key: "degree", label: "Degree", half: true }, { key: "field", label: "Field", half: true }, { key: "start", label: "Start", half: true }, { key: "end", label: "End", half: true }, { key: "notes", label: "Notes" }]}
            onSave={(v) => save("education", v)} onCancel={() => cancel("education", e.id, !e.school)} onDelete={() => remove("education", e.id)} />
        ) : (
          <div className="pf-item" key={e.id}>
            <div className="avatar">{(e.school || "?").charAt(0).toUpperCase()}</div>
            <div className="pf-main">
              <div className="pf-line"><div><b>{e.school}</b> <span className="muted">{[e.degree, e.field].filter(Boolean).join(", ")}</span></div><span className="date">{fmtRange(e.start, e.end, false)}</span></div>
              {e.notes && <p className="pf-text">{e.notes}</p>}
              {editable && <button className="pf-edit" onClick={() => setEditing(e.id)}>Edit</button>}
            </div>
          </div>
        ))}
      </Section>

      <Section label="Skills" editable={editable} when={p.skills.length > 0}><Chips items={p.skills} onChange={(skills) => set({ skills })} editable={editable} placeholder="Add a skill and press Enter" /></Section>
      <Section label="Certifications" editable={editable} when={p.certifications.length > 0}><Chips items={p.certifications} onChange={(certifications) => set({ certifications })} editable={editable} placeholder="Add a certification" /></Section>
      <Section label="Languages" editable={editable} when={p.languages.length > 0}><Chips items={p.languages} onChange={(languages) => set({ languages })} editable={editable} placeholder="Add a language" /></Section>

      </div></div>

      {editable && (
        <section className="pf-prefs">
          <div className="pf-label"><h3>Job search</h3><span className="muted small">Private. Never on your public page.</span></div>
          <div className="card" style={{ margin: 0 }}>
            <label htmlFor="pf-roles">Roles you want</label>
            <input id="pf-roles" value={p.targetRoles} onChange={(e) => set({ targetRoles: e.target.value })} placeholder="e.g. Senior Product Manager, Growth Lead" />
            <label htmlFor="pf-no">Deal-breakers (one per line; a hit forces a skip)</label>
            <textarea id="pf-no" style={{ minHeight: 84 }} value={p.dealBreakers} onChange={(e) => set({ dealBreakers: e.target.value })} placeholder={"No visa sponsorship\nOn-site only outside my city"} />
            <label htmlFor="pf-min">{`Advise against applying below score: ${p.minScore.toFixed(1)}`}</label>
            <input id="pf-min" type="range" min={1} max={5} step={0.5} value={p.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} />
            <label htmlFor="pf-notes">Anything else Donna should know</label>
            <textarea id="pf-notes" style={{ minHeight: 84 }} value={p.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Constraints, preferences, projects not on the CV" />
          </div>
        </section>
      )}
    </div>
  );
}

function Section({ label, children, editable, onAdd, empty, when }: { label: string; children?: ReactNode; editable: boolean; onAdd?: () => void; empty?: string; when?: boolean }) {
  const has = when ?? (Array.isArray(children) ? children.length > 0 : Boolean(children));
  if (!editable && !has) return null;
  return (
    <section className="pf-sec">
      <div className="pf-label"><h3>{label}</h3>{editable && onAdd && <button className="pf-add" onClick={onAdd} aria-label={`Add ${label}`}>+ Add</button>}</div>
      <div className="pf-body">{has ? children : empty ? <p className="muted">{empty}</p> : children}</div>
    </section>
  );
}

function Inline({ value, onChange, editable, placeholder, className = "" }: { value: string; onChange: (v: string) => void; editable: boolean; placeholder: string; className?: string }) {
  if (!editable) return value ? <span className={className}>{value}</span> : null;
  return <input className={`pf-in ${className}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />;
}

function Links({ p, set, editable }: { p: Profile; set: (x: Partial<Profile>) => void; editable: boolean }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const addLink = () => {
    if (!url.trim()) return;
    const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    set({ links: [...p.links, { label: label.trim(), url: u }] });
    setLabel(""); setUrl("");
  };
  return (
    <div className="pf-links">
      {p.links.map((l, i) => (
        <span className="chip" key={i}><a href={l.url} target="_blank" rel="noreferrer">{l.label || l.url.replace(/^https?:\/\//, "")}</a>
          {editable && <button aria-label="Remove link" onClick={() => set({ links: p.links.filter((_, j) => j !== i) })}>×</button>}</span>
      ))}
      {editable && (
        <span className="pf-addlink">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label="Link label" style={{ width: 90 }} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="linkedin.com/in/you" aria-label="Link URL" style={{ width: 170 }} />
          <button className="btn ghost" onClick={addLink}>Add link</button>
        </span>
      )}
    </div>
  );
}

function Chips({ items, onChange, editable, placeholder }: { items: string[]; onChange: (v: string[]) => void; editable: boolean; placeholder: string }) {
  const [v, setV] = useState("");
  const add = () => { const t = v.trim(); if (t && !items.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...items, t]); setV(""); };
  return (
    <div>
      <div className="chips">{items.map((s) => <span className="chip" key={s}>{s}{editable && <button aria-label={`Remove ${s}`} onClick={() => onChange(items.filter((x) => x !== s))}>×</button>}</span>)}</div>
      {editable && <input style={{ marginTop: 10, maxWidth: 320 }} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} placeholder={placeholder} aria-label={placeholder} />}
    </div>
  );
}

type Field<T> = { key: keyof T & string; label: string; kind?: "text" | "area" | "bool" | "lines" | "select"; half?: boolean; options?: { value: string; label: string }[] };

function ItemForm<T extends { id: string }>({ item, fields, onSave, onCancel, onDelete }: { item: T; fields: Field<T>[]; onSave: (v: T) => void; onCancel: () => void; onDelete: () => void }) {
  const [d, setD] = useState<T>(item);
  const [lines, setLines] = useState<Record<string, string>>(() => Object.fromEntries(fields.filter((f) => f.kind === "lines").map((f) => [f.key, ((item[f.key] as unknown as string[]) ?? []).join("\n")])));
  const setK = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const commit = () => {
    const out = { ...d } as Record<string, unknown>;
    for (const f of fields) if (f.kind === "lines") out[f.key] = (lines[f.key] ?? "").split("\n").map((s) => s.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
    onSave(out as T);
  };
  const id = (k: string) => `f-${item.id}-${k}`;
  return (
    <div className="pf-form card">
      <div className="grid2">
        {fields.map((f) => {
          const val = d[f.key] as unknown;
          const box = (el: ReactNode) => <div key={f.key} style={f.half ? undefined : { gridColumn: "1 / -1" }}>{el}</div>;
          if (f.kind === "bool") return box(<label className="check"><input type="checkbox" checked={Boolean(val)} onChange={(e) => setK(f.key, e.target.checked)} /> {f.label}</label>);
          return box(<>
            <label htmlFor={id(f.key)}>{f.label}</label>
            {f.kind === "area" ? <textarea id={id(f.key)} style={{ minHeight: 80 }} value={String(val ?? "")} onChange={(e) => setK(f.key, e.target.value)} />
              : f.kind === "lines" ? <textarea id={id(f.key)} style={{ minHeight: 120 }} value={lines[f.key] ?? ""} onChange={(e) => setLines((l) => ({ ...l, [f.key]: e.target.value }))} />
              : f.kind === "select" ? <select id={id(f.key)} value={String(val ?? "")} onChange={(e) => setK(f.key, e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : <input id={id(f.key)} value={String(val ?? "")} onChange={(e) => setK(f.key, e.target.value)} />}
          </>);
        })}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" onClick={commit}>Save</button>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn danger" style={{ marginLeft: "auto" }} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
