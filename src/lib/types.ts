export type Provider = "anthropic" | "openai" | "openai-compatible";
export type ExportFormat = "pdf" | "docx" | "md";
export type TemplateId = "classic" | "modern" | "compact";

export const STATUSES = [
  "Saved",
  "Evaluated",
  "Ready to apply",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

export type VoiceMode = "off" | "natural" | "browser" | "openai" | "custom";

export interface VoiceSettings {
  mode: VoiceMode;
  naturalVoice: string; // id of a pre-rendered open-source voice
  browserVoice: string; // voiceURI, "" = auto-pick
  openaiKey: string; // falls back to the main key when the provider is OpenAI
  openaiVoice: string;
  customUrl: string; // OpenAI-compatible server, e.g. a local VoiceStudio / voicebox
  customModel: string;
  customVoice: string;
}

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string; // only for openai-compatible
  defaultFormat: ExportFormat;
  defaultTemplate: TemplateId;
  voice: VoiceSettings;
}

export interface Link {
  label: string;
  url: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  start: string; // "2021-03" or "2021"
  end: string; // "" when current
  current: boolean;
  description: string;
  highlights: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  notes: string;
}

export interface Achievement {
  id: string;
  title: string;
  metric: string; // "+38%", "$1.2M", "12 people"
  detail: string;
  year: string;
  experienceId: string; // optional link to a role
}

export interface Project {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface Profile {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: Link[];
  about: string;
  experience: Experience[];
  education: Education[];
  achievements: Achievement[];
  projects: Project[];
  skills: string[];
  languages: string[];
  certifications: string[];
  // job search preferences (private, never on the public page)
  targetRoles: string;
  dealBreakers: string; // one per line
  minScore: number; // advise against applying below this (1-5)
  notes: string;
  // raw text imported during onboarding, kept so nothing is lost
  masterCv: string;
  handle: string; // reserved for the shareable page
  photo: string; // small data URL, resized in the browser
  cover: number; // index of a cover style
  onboarded: boolean;
}

export interface DimensionScore {
  name: string;
  score: number; // 1-5
  rationale: string;
}

export interface Evaluation {
  score: number; // 1-5
  recommendation: "apply" | "consider" | "skip";
  summary: string;
  dimensions: DimensionScore[];
  strengths: string[];
  gaps: string[];
  dealBreakerHits: string[];
  legitimacyFlags: string[];
  salaryNote: string;
  at: string;
}

export interface Documents {
  cv: string; // markdown
  coverLetter: string; // markdown
  review: string; // reviewer feedback
  unsupportedKeywords: string[];
  template: TemplateId;
  at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string; // paste | url | feed:<name> | bookmarklet
  status: Status;
  notes: string;
  followUpDate: string; // yyyy-mm-dd or ""
  createdAt: string;
  appliedAt: string;
  evaluation?: Evaluation;
  documents?: Documents;
  prep?: string; // interview prep markdown
  outreach?: string; // outreach drafts markdown
}

export interface Story {
  id: string;
  title: string;
  situation: string;
  action: string;
  result: string;
  reflection: string;
}

export interface Answer {
  id: string;
  question: string;
  answer: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  profile: Profile;
  jobs: Job[];
  stories: Story[];
  answers: Answer[];
}
