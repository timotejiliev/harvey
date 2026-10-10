import { NextResponse } from "next/server";
import { fetchFeed, type FeedKind } from "@/lib/feeds";

export const maxDuration = 30;
const KINDS = ["greenhouse", "lever", "ashby", "remoteok"];

export async function POST(req: Request) {
  try {
    const { kind, slug } = (await req.json()) as { kind: FeedKind; slug: string };
    if (!KINDS.includes(kind)) return NextResponse.json({ error: "Unknown feed" }, { status: 400 });
    if (kind !== "remoteok" && !/^[a-z0-9._-]+$/i.test(slug ?? "")) {
      return NextResponse.json({ error: "Invalid company slug" }, { status: 400 });
    }
    const jobs = await fetchFeed(kind, slug);
    return NextResponse.json({ jobs: jobs.slice(0, 200) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
