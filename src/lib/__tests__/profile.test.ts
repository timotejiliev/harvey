import { describe, expect, it } from "vitest";
import { emptyProfile } from "../defaults";
import { hasProfileData, mergeParsed, migrateProfile, normalizeParsed, profileGaps, profileToMarkdown } from "../profile";

const raw = {
  name: " Ada Lovelace ", headline: "Analyst", email: "ada@x.com",
  experience: [
    { company: "Acme", title: "Lead", start: "2020-01", end: "Present", highlights: ["Cut costs 30%", "", "Hired 5"] },
    { company: "", title: "" },
    "junk",
  ],
  achievements: [{ title: "Saved $1.2M", metric: "$1.2M" }, { metric: "no title" }],
  skills: "SQL, Python\nGo",
  links: [{ label: "GH", url: "https://github.com/ada" }, { label: "empty" }],
};

describe("normalizeParsed", () => {
  const p = normalizeParsed(raw);
  it("cleans strings and drops empty entries", () => {
    expect(p.name).toBe("Ada Lovelace");
    expect(p.experience).toHaveLength(1);
    expect(p.achievements).toHaveLength(1);
    expect(p.links).toHaveLength(1);
  });
  it("treats 'Present' as current and clears the end date", () => {
    expect(p.experience![0].current).toBe(true);
    expect(p.experience![0].end).toBe("");
    expect(p.experience![0].highlights).toEqual(["Cut costs 30%", "Hired 5"]);
  });
  it("accepts skills as a delimited string", () => expect(p.skills).toEqual(["SQL", "Python", "Go"]));
  it("survives garbage", () => expect(normalizeParsed(null).experience).toEqual([]));
});

describe("profileToMarkdown", () => {
  it("renders structured data for the AI", () => {
    const md = profileToMarkdown({ ...emptyProfile, ...normalizeParsed(raw) } as never);
    expect(md).toContain("# Ada Lovelace");
    expect(md).toContain("### Acme - Lead | 2020-01 to Present");
    expect(md).toContain("- Cut costs 30%");
    expect(md).toContain("## Skills\nSQL, Python, Go");
  });
  it("falls back to raw imported text", () => expect(profileToMarkdown({ ...emptyProfile, masterCv: "raw cv" })).toBe("raw cv"));
});

describe("mergeParsed", () => {
  it("never overwrites what the user already has and de-duplicates", () => {
    const base = { ...emptyProfile, ...normalizeParsed(raw), name: "Mine" } as never;
    const merged = mergeParsed(base, normalizeParsed({ name: "Other", experience: [{ company: "Acme", title: "Lead" }, { company: "Beta", title: "Dev" }], skills: ["sql", "Rust"] }));
    expect(merged.name).toBe("Mine");
    expect(merged.experience.map((e) => e.company)).toEqual(["Acme", "Beta"]);
    expect(merged.skills).toEqual(["SQL", "Python", "Go", "Rust"]);
  });
});

describe("migrateProfile", () => {
  it("converts the old string links and old free-text CV", () => {
    const m = migrateProfile({ masterCv: "old", links: "https://a.com\nhttps://b.com", name: "X" });
    expect(m.links.map((l) => l.url)).toEqual(["https://a.com", "https://b.com"]);
    expect(m.onboarded).toBe(true);
    expect(hasProfileData(m)).toBe(true);
  });
  it("new users are not onboarded", () => expect(migrateProfile(undefined).onboarded).toBe(false));
});

describe("profileGaps", () => {
  it("names concrete gaps", () => {
    const g = profileGaps({ ...emptyProfile, ...normalizeParsed({ experience: [{ company: "Acme", title: "Dev" }] }) } as never);
    expect(g[0]).toBe("Acme has no results listed");
  });
});
