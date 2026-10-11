import { esc } from "./markdown";
import { fmtRange } from "./profile";
import type { Profile } from "./types";

/** A single self-contained HTML page of the public profile (no job-search preferences). */
export function profileHtml(p: Profile): string {
  const sec = (label: string, body: string) => (body ? `<section><h2>${label}</h2><div>${body}</div></section>` : "");
  const exp = p.experience.map((e) => `<article><div class="h"><b>${esc(e.title)}</b> <span>${esc(e.company)}</span><time>${esc(fmtRange(e.start, e.end, e.current))}</time></div>${e.location ? `<p class="m">${esc(e.location)}</p>` : ""}${e.description ? `<p>${esc(e.description)}</p>` : ""}${e.highlights.length ? `<ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}</article>`).join("");
  const ach = p.achievements.map((a) => `<article class="w"><strong>${esc(a.metric)}</strong><b>${esc(a.title)}</b>${a.detail ? `<p>${esc(a.detail)}</p>` : ""}</article>`).join("");
  const edu = p.education.map((e) => `<article><div class="h"><b>${esc(e.school)}</b> <span>${esc([e.degree, e.field].filter(Boolean).join(", "))}</span><time>${esc(fmtRange(e.start, e.end, false))}</time></div></article>`).join("");
  const proj = p.projects.map((x) => `<article><div class="h"><b>${x.url ? `<a href="${esc(x.url)}">${esc(x.name)}</a>` : esc(x.name)}</b></div>${x.description ? `<p>${esc(x.description)}</p>` : ""}</article>`).join("");
  const chips = (a: string[]) => (a.length ? `<p class="chips">${a.map((s) => `<span>${esc(s)}</span>`).join("")}</p>` : "");
  const links = p.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label || l.url.replace(/^https?:\/\//, ""))}</a>`).join(" ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.name)}</title><style>
:root{color-scheme:light dark;--bg:#f4f2ee;--ink:#16151a;--mute:#6f6d76;--line:rgba(22,21,26,.1);--chip:#e9e6e0;--accent:#d9552b}
@media(prefers-color-scheme:dark){:root{--bg:#0f0e12;--ink:#f2f0ee;--mute:#9a97a1;--line:rgba(255,255,255,.1);--chip:#222127;--accent:#ee7a4a}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:72px 24px 96px}h1{font-size:44px;line-height:1.05;letter-spacing:-.035em;margin:0}
.sub{color:var(--mute);margin:8px 0 0;font-size:18px}.meta{color:var(--mute);margin:14px 0 0;display:flex;gap:14px;flex-wrap:wrap;font-size:14px}.meta a{color:var(--ink)}
section{display:grid;grid-template-columns:140px 1fr;gap:16px;border-top:1px solid var(--line);margin-top:40px;padding-top:24px}h2{font-size:13px;font-weight:550;color:var(--mute);margin:3px 0 0}
article{margin-bottom:22px}.h{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}.h span{color:var(--mute)}time{margin-left:auto;color:var(--mute);font-size:14px}.m{color:var(--mute);margin:0;font-size:14px}p{margin:4px 0}ul{margin:6px 0;padding-left:20px}
.w strong{display:block;font-size:30px;letter-spacing:-.03em;color:var(--accent)}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{background:var(--chip);padding:3px 12px;border-radius:99px;font-size:14px}
@media(max-width:600px){section{grid-template-columns:1fr;gap:6px}h1{font-size:34px}}
</style></head><body><main><h1>${esc(p.name)}</h1>${p.headline ? `<p class="sub">${esc(p.headline)}</p>` : ""}<div class="meta">${p.location ? `<span>${esc(p.location)}</span>` : ""}${p.email ? `<span>${esc(p.email)}</span>` : ""}${links}</div>
${sec("About", p.about ? `<p>${esc(p.about)}</p>` : "")}${sec("Experience", exp)}${sec("Achievements", ach)}${sec("Projects", proj)}${sec("Education", edu)}${sec("Skills", chips(p.skills))}${sec("Certifications", chips(p.certifications))}${sec("Languages", chips(p.languages))}</main></body></html>`;
}
