import type { AppData } from "./types";

export const defaultData: AppData = {
  version: 1,
  settings: {
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-5-5",
    baseUrl: "",
    defaultFormat: "pdf",
    defaultTemplate: "classic",
  },
  profile: {
    name: "",
    email: "",
    phone: "",
    location: "",
    links: "",
    masterCv: "",
    targetRoles: "",
    dealBreakers: "",
    minScore: 4,
    notes: "",
  },
  jobs: [],
  stories: [],
  answers: [],
};

export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  "openai-compatible": [],
};
