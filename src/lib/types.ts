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

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string; // only for openai-compatible
  defaultFormat: ExportFormat;
  defaultTemplate: TemplateId;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string; // free text, one per line
  masterCv: string; // markdown, source of truth
  targetRoles: string;
  dealBreakers: string; // one per line
  minScore: number; // advise against applying below this (1-5)
  notes: string; // extra proof points, preferences, constraints
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
