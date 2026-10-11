/**
 * Donna's character. Original writing: confident, unflappable, quietly funny,
 * always a step ahead of you. Inspired by an archetype (the brilliant right hand),
 * not by any real person's voice or scripted lines.
 */
export const DONNA_VOICE_INSTRUCTIONS =
  "Speak as a warm, self-assured woman in her late thirties. Unhurried pace, low and smooth register, a trace of dry amusement. Land the ends of sentences with certainty. Never chirpy, never robotic.";

export interface Line {
  id: string;
  text: string;
}

/** Every scripted line has a stable id so a pre-rendered clip at /voice/<id>.mp3 can replace live synthesis. */
export const LINES = {
  welcome: { id: "welcome", text: "Hello. I'm Donna. From here on, your job search is my problem, and you're going to look very good doing it." },
  askName: { id: "ask-name", text: "First things first. What should I call you?" },
  brain: { id: "brain", text: "I think best with a serious brain behind me. Pick your provider and paste a key. It stays in this browser, and nobody else sees it." },
  brainSkip: { id: "brain-skip", text: "No key yet? That's fine. We'll do this the slow way, and you can add one whenever you like." },
  materials: { id: "materials", text: "Now show me who you are. Drop in your CV, your LinkedIn profile saved as a PDF, or the link to your website. Anything you've got." },
  reading: { id: "reading", text: "Give me a moment. I'm reading everything, including the parts you forgot to mention." },
  targets: { id: "targets", text: "Last question. What are we aiming at, and what's absolutely off the table?" },
  done: { id: "done", text: "That's everything I need. Now, let's go find you something worth getting out of bed for." },
  error: { id: "error", text: "That didn't work. It happens. Check the details and we'll try again." },
} satisfies Record<string, Line>;

export const greetName = (name: string): Line => ({ id: "", text: `${name}. Good. I'll remember that.` });

export const reviewLine = (n: { roles: number; wins: number; skills: number }, gaps: string[]): Line => ({
  id: "",
  text:
    `Here's what I found. ${n.roles} ${n.roles === 1 ? "role" : "roles"}, ${n.wins} standout ${n.wins === 1 ? "result" : "results"}, and ${n.skills} skills.` +
    (gaps.length ? ` One thing: ${gaps[0]}. We'll fix that.` : " Nothing missing that I can see."),
});

export function greeting(name: string, hour = new Date().getHours()): string {
  const first = name.split(" ")[0];
  const part = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  return first ? `${part}, ${first}.` : `${part}.`;
}

export function pipelineLine(n: { jobs: number; due: number; ready: number }): string {
  if (n.jobs === 0) return "Nothing in the pipeline yet. Give me a posting and I'll tell you if it's worth your time.";
  if (n.due > 0) return `${n.due} follow-up${n.due > 1 ? "s are" : " is"} due. Politely persistent beats forgotten.`;
  if (n.ready > 0) return `${n.ready} application${n.ready > 1 ? "s are" : " is"} drafted and waiting for your approval.`;
  return "Quiet day. Good time to add something ambitious.";
}
