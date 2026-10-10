/** Pull a JobPosting out of JSON-LD if present, else return visible text. */
export function htmlToJobText(html: string): { text: string; title?: string; company?: string; location?: string } {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ld) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      const jp = items.find((i: { "@type"?: string }) => i?.["@type"] === "JobPosting");
      if (jp) {
        const loc = jp.jobLocation?.address;
        return {
          title: jp.title,
          company: jp.hiringOrganization?.name,
          location: [loc?.addressLocality, loc?.addressRegion, loc?.addressCountry].filter((x) => typeof x === "string").join(", "),
          text: stripTags(String(jp.description ?? "")),
        };
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  }
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ");
  return { text: stripTags(body) };
}

export function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
