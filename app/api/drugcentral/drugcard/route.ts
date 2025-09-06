import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableDrugCentral) return NextResponse.json({ disabled: true });
  const name = new URL(req.url).searchParams.get("name") || "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const url = `https://drugcentral.org/api/drugcard?name=${encodeURIComponent(name)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const drug = {
    name: j.name,
    synonyms: (j.synonyms || []).map((s: any) => (typeof s === "string" ? s : s.name)),
    indications: (j.indications || []).map((i: any) => (i.name || i)),
    moa: (j.moa || []).map((m: any) => (m.name || m)),
    targets: (j.targets || []).map((t: any) => (t.name || t)),
  };

  return NextResponse.json({ drug });
}
