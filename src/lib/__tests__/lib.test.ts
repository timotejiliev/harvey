import { describe, expect, it } from "vitest";
import { parseJson } from "../ai";
import { htmlToJobText } from "../html";
import { mdToHtml, mdToBlocks } from "../markdown";
import { assertPublicUrl, isBlockedSite } from "../ssrf";

describe("parseJson", () => {
  it("handles fenced and prefixed output", () => {
    expect(parseJson<{ a: number }>('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson<{ a: number }>('text {"a":2} tail')).toEqual({ a: 2 });
  });
  it("throws without JSON", () => expect(() => parseJson("nope")).toThrow());
});

describe("htmlToJobText", () => {
  it("prefers JSON-LD JobPosting", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"Dev","hiringOrganization":{"name":"Acme"},"description":"<p>Build things</p>"}</script>`;
    const r = htmlToJobText(html);
    expect(r.title).toBe("Dev");
    expect(r.company).toBe("Acme");
    expect(r.text).toContain("Build things");
  });
  it("strips scripts from plain pages", () => {
    expect(htmlToJobText("<script>x()</script><p>Hello</p>").text).toBe("Hello");
  });
});

describe("markdown", () => {
  it("escapes HTML", () => expect(mdToHtml("<script>alert(1)</script>")).not.toContain("<script>"));
  it("renders lists and headings", () => {
    expect(mdToHtml("# A\n- x\n- y")).toBe("<h1>A</h1>\n<ul>\n<li>x</li>\n<li>y</li>\n</ul>");
    expect(mdToBlocks("## H\n- b").map((b) => b.kind)).toEqual(["h2", "li"]);
  });
});

describe("ssrf", () => {
  it("blocks private and non-http targets", async () => {
    await expect(assertPublicUrl("http://127.0.0.1/x")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254/")).rejects.toThrow();
    await expect(assertPublicUrl("http://localhost:3000")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
  });
  it("blocks ToS-restricted sites", () => {
    expect(isBlockedSite("www.linkedin.com")).toBe(true);
    expect(isBlockedSite("boards.greenhouse.io")).toBe(false);
  });
});
