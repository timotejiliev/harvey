import { emptyProfile } from "./defaults";
import { uid } from "./id";
import type { Achievement, Education, Experience, Link, Profile, Project } from "./types";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : typeof v === "string" ? v.split(/\n|,/).map((x) => x.trim()).filter(Boolean) : [];
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Record<string, unknown>[] : []);

export const fmtRange = (start: string, end: string, current: boolean) =>
  [start, current ? "Present" : end].filter(Boolean).join(" to ");

/** Turn AI-extracted JSON (untrusted shape) into a clean partial profile with ids. */
export function normalizeParsed(raw: unknown): Partial<Profile> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const experience: Experience[] = arr(r.experience).map((e) => ({
    id: uid(), company: str(e.company), title: str(e.title), location: str(e.location),
    start: str(e.start), end: str(e.end), current: e.current === true || /present|current/i.test(str(e.end)),
    description: str(e.description), highlights: strList(e.highlights),
  })).filter((e) => e.company || e.title);
  experience.forEach((e) => { if (e.current) e.end = ""; });
  const education: Education[] = arr(r.education).map((e) => ({
    id: uid(), school: str(e.school), degree: str(e.degree), field: str(e.field), start: str(e.start), end: str(e.end), notes: str(e.notes),
  })).filter((e) => e.school);
  const achievements: Achievement[] = arr(r.achievements).map((a) => ({
    id: uid(), title: str(a.title), metric: str(a.metric), detail: str(a.detail), year: str(a.year), experienceId: "",
  })).filter((a) => a.title);
  const projects: Project[] = arr(r.projects).map((p) => ({ id: uid(), name: str(p.name), url: str(p.url), description: str(p.description) })).filter((p) => p.name);
  const links: Link[] = arr(r.links).map((l) => ({ label: str(l.label), url: str(l.url) })).filter((l) => l.url);
  return {
    name: str(r.name), headline: str(r.headline), email: str(r.email), phone: str(r.phone), location: str(r.location),
    about: str(r.about), links, experience, education, achievements, projects,
    skills: strList(r.skills), languages: strList(r.languages), certifications: strList(r.certifications),
  };
}

/** Merge parsed data into a profile without wiping what the user already entered. */
export function mergeParsed(base: Profile, parsed: Partial<Profile>): Profile {
  const out: Profile = { ...base };
  for (const k of ["name", "headline", "email", "phone", "location", "about"] as const) {
    if (!out[k] && parsed[k]) out[k] = parsed[k] as string;
  }
  const seen = new Set(base.experience.map((e) => `${e.company}|${e.title}`.toLowerCase()));
  out.experience = [...base.experience, ...(parsed.experience ?? []).filter((e) => !seen.has(`${e.company}|${e.title}`.toLowerCase()))];
  const eduSeen = new Set(base.education.map((e) => `${e.school}|${e.degree}`.toLowerCase()));
  out.education = [...base.education, ...(parsed.education ?? []).filter((e) => !eduSeen.has(`${e.school}|${e.degree}`.toLowerCase()))];
  const aSeen = new Set(base.achievements.map((a) => a.title.toLowerCase()));
  out.achievements = [...base.achievements, ...(parsed.achievements ?? []).filter((a) => !aSeen.has(a.title.toLowerCase()))];
  const pSeen = new Set(base.projects.map((p) => p.name.toLowerCase()));
  out.projects = [...base.projects, ...(parsed.projects ?? []).filter((p) => !pSeen.has(p.name.toLowerCase()))];
  const lSeen = new Set(base.links.map((l) => l.url.toLowerCase()));
  out.links = [...base.links, ...(parsed.links ?? []).filter((l) => !lSeen.has(l.url.toLowerCase()))];
  const union = (a: string[], b: string[] = []) => [...a, ...b.filter((x) => !a.some((y) => y.toLowerCase() === x.toLowerCase()))];
  out.skills = union(base.skills, parsed.skills);
  out.languages = union(base.languages, parsed.languages);
  out.certifications = union(base.certifications, parsed.certifications);
  return out;
}

/** Stored profiles from older versions (string links, free-text CV) load cleanly. */
export function migrateProfile(raw: unknown): Profile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const p: Profile = { ...emptyProfile, ...(r as Partial<Profile>) };
  if (typeof r.links === "string") {
    p.links = (r.links as string).split("\n").map((l) => l.trim()).filter(Boolean).map((url) => ({ label: "", url }));
  } else if (!Array.isArray(r.links)) p.links = [];
  for (const k of ["experience", "education", "achievements", "projects"] as const) if (!Array.isArray(p[k])) (p[k] as unknown[]) = [];
  for (const k of ["skills", "languages", "certifications"] as const) if (!Array.isArray(p[k])) p[k] = [];
  if (typeof r.onboarded !== "boolean") p.onboarded = Boolean(p.masterCv || p.experience.length);
  return p;
}

export function hasProfileData(p: Profile): boolean {
  return Boolean(p.experience.length || p.education.length || p.masterCv.trim() || p.about.trim());
}

/** The "master CV" the AI works from, generated from the structured profile. */
export function profileToMarkdown(p: Profile): string {
  const structured = p.experience.length || p.education.length || p.achievements.length || p.skills.length || p.about;
  if (!structured) return p.masterCv;
  const L: string[] = [];
  L.push(`# ${p.name || "Candidate"}`);
  if (p.headline) L.push(p.headline);
  const contact = [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter(Boolean).join(" | ");
  if (contact) L.push(contact);
  if (p.about) L.push("", "## Summary", p.about);
  if (p.experience.length) {
    L.push("", "## Experience");
    for (const e of p.experience) {
      L.push(`### ${e.company}${e.title ? ` - ${e.title}` : ""} | ${fmtRange(e.start, e.end, e.current)}${e.location ? ` | ${e.location}` : ""}`);
      if (e.description) L.push(e.description);
      e.highlights.forEach((h) => L.push(`- ${h}`));
      p.achievements.filter((a) => a.experienceId === e.id).forEach((a) => L.push(`- ${a.metric ? `${a.metric}: ` : ""}${a.title}${a.detail ? `. ${a.detail}` : ""}`));
    }
  }
  const loose = p.achievements.filter((a) => !p.experience.some((e) => e.id === a.experienceId));
  if (loose.length) {
    L.push("", "## Achievements");
    loose.forEach((a) => L.push(`- ${a.metric ? `${a.metric}: ` : ""}${a.title}${a.detail ? `. ${a.detail}` : ""}${a.year ? ` (${a.year})` : ""}`));
  }
  if (p.projects.length) {
    L.push("", "## Projects");
    p.projects.forEach((x) => L.push(`- ${x.name}${x.url ? ` (${x.url})` : ""}${x.description ? `: ${x.description}` : ""}`));
  }
  if (p.education.length) {
    L.push("", "## Education");
    p.education.forEach((e) => L.push(`- ${[e.degree, e.field].filter(Boolean).join(", ")} - ${e.school} | ${fmtRange(e.start, e.end, false)}${e.notes ? ` | ${e.notes}` : ""}`));
  }
  if (p.skills.length) L.push("", "## Skills", p.skills.join(", "));
  if (p.certifications.length) L.push("", "## Certifications", ...p.certifications.map((c) => `- ${c}`));
  if (p.languages.length) L.push("", "## Languages", p.languages.join(", "));
  return L.join("\n");
}

/** Gaps Donna can call out: concrete, checkable, never invented. */
export function profileGaps(p: Profile): string[] {
  const g: string[] = [];
  p.experience.filter((e) => e.highlights.length === 0 && !e.description).forEach((e) => g.push(`${e.company || e.title} has no results listed`));
  if (!p.about) g.push("no summary");
  if (p.achievements.length === 0) g.push("no standout achievements pulled out yet");
  if (p.skills.length === 0) g.push("no skills listed");
  return g;
}
