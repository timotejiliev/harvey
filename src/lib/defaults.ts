import type { AppData, Profile, VoiceSettings } from "./types";

export const defaultVoice: VoiceSettings = {
  mode: "browser",
  browserVoice: "",
  openaiKey: "",
  openaiVoice: "coral",
  customUrl: "",
  customModel: "tts-1",
  customVoice: "donna",
};

export const emptyProfile: Profile = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  about: "",
  experience: [],
  education: [],
  achievements: [],
  projects: [],
  skills: [],
  languages: [],
  certifications: [],
  targetRoles: "",
  dealBreakers: "",
  minScore: 4,
  notes: "",
  masterCv: "",
  handle: "",
  onboarded: false,
};

export const defaultData: AppData = {
  version: 1,
  settings: {
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-5-5",
    baseUrl: "",
    defaultFormat: "pdf",
    defaultTemplate: "classic",
    voice: defaultVoice,
  },
  profile: emptyProfile,
  jobs: [],
  stories: [],
  answers: [],
};

export const MODEL_SUGGESTIONS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  "openai-compatible": [],
};
