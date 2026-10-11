import { stripTags } from "./html";

export interface FeedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
}

export type FeedKind = "greenhouse" | "lever" | "ashby" | "remoteok";

/** Only official public job-board APIs; no scraping of sites that forbid it. */
export async function fetchFeed(kind: FeedKind, slug: string): Promise<FeedJob[]> {
  const get = async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "DonnaJobTracker/0.1" } });
    if (!r.ok) throw new Error(`Feed returned ${r.status} (check the company slug)`);
    return r.json();
  };
  const safe = encodeURIComponent(slug);
  if (kind === "greenhouse") {
    const d = await get(`https://boards-api.greenhouse.io/v1/boards/${safe}/jobs?content=true`);
    return (d.jobs ?? []).map((j: any) => ({
      title: j.title, company: slug, location: j.location?.name ?? "",
      url: j.absolute_url, description: stripTags(decodeEntities(j.content ?? "")),
    }));
  }
  if (kind === "lever") {
    const d = await get(`https://api.lever.co/v0/postings/${safe}?mode=json`);
    return (d ?? []).map((j: any) => ({
      title: j.text, company: slug, location: j.categories?.location ?? "",
      url: j.hostedUrl, description: j.descriptionPlain ?? stripTags(j.description ?? ""),
    }));
  }
  if (kind === "ashby") {
    const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${safe}`);
    return (d.jobs ?? []).map((j: any) => ({
      title: j.title, company: slug, location: j.location ?? "",
      url: j.jobUrl, description: j.descriptionPlain ?? stripTags(j.descriptionHtml ?? ""),
    }));
  }
  const d = await get("https://remoteok.com/api");
  return (d as any[]).filter((j) => j.position).map((j) => ({
    title: j.position, company: j.company, location: j.location || "Remote",
    url: j.url, description: stripTags(j.description ?? ""),
  }));
}

function decodeEntities(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
