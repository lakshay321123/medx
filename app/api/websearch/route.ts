import { NextResponse } from "next/server";

type Hit = { title: string; url: string; snippet?: string; source?: "web" };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const key = process.env.GOOGLE_CSE_KEY;
  const cx  = process.env.GOOGLE_CSE_CX;

  if (!q) return NextResponse.json({ results: [] });

  if (!key || !cx) {
    // Don’t crash the app; just say “no web”
    return NextResponse.json({ results: [], error: "missing_google_cse_env" }, { status: 200 });
  }

  const api = new URL("https://www.googleapis.com/customsearch/v1");
  api.searchParams.set("key", key);
  api.searchParams.set("cx", cx);
  api.searchParams.set("q", q);

  const r = await fetch(api.toString(), { method: "GET", cache: "no-store" });
  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    // Gentle failure → keep UX smooth
    return NextResponse.json({ results: [], error: "google_cse_http_error", status: r.status }, { status: 200 });
  }

  const results: Hit[] = Array.isArray((data as any).items)
    ? (data as any).items.slice(0, 8).map((it: any) => ({
        title: it?.title || it?.link || "Untitled",
        url: it?.link,
        snippet: it?.snippet || "",
        source: "web",
      }))
    : [];

  return NextResponse.json({ results });
}
