import { NextResponse } from "next/server";
import { htmlToJobText } from "@/lib/html";
import { assertPublicUrl, isBlockedSite } from "@/lib/ssrf";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url: string };
    const u = await assertPublicUrl(url);
    if (isBlockedSite(u.hostname.toLowerCase())) {
      return NextResponse.json(
        { error: "This site forbids automated access. Open the posting and paste its text instead (or use the bookmarklet)." },
        { status: 422 },
      );
    }
    const res = await fetch(u, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; HarveyJobTracker/0.1)" },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({ error: "Page redirected. Paste the final URL or the posting text." }, { status: 422 });
    }
    if (!res.ok) return NextResponse.json({ error: `Site returned ${res.status}. Paste the text instead.` }, { status: 422 });
    const html = (await res.text()).slice(0, 2_000_000);
    const out = htmlToJobText(html);
    if (out.text.length < 200) {
      return NextResponse.json({ error: "Could not read this page (it may need JavaScript). Paste the text instead." }, { status: 422 });
    }
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
