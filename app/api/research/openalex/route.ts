import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { searchOpenAlexWorks, getOpenAlexWorkById } from "@/lib/openalex";

export async function GET(req: NextRequest) {
  if (!flags.enableOpenAlex) return NextResponse.json({ disabled: true });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const work = await getOpenAlexWorkById(id);
    return NextResponse.json({ work });
  }
  const q = url.searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const perPage = parseInt(url.searchParams.get("perPage") || "10", 10);
  const from = url.searchParams.get("from") || undefined;
  const is_oa_param = url.searchParams.get("is_oa");
  const is_oa = is_oa_param === null ? undefined : is_oa_param === "true";
  const works = await searchOpenAlexWorks(q, perPage, from, is_oa);
  return NextResponse.json({ works });
}
