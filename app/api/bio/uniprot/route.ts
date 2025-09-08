import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  const r = await fetch(`https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(q)}&format=json&size=5`, { cache:"no-store" });
  if (!r.ok) return NextResponse.json({ ok:false, error:r.statusText }, { status:r.status });
  const j = await r.json();
  return NextResponse.json({ ok:true, results: (j.results||[]).map((x:any)=>({
    id:x.primaryAccession, rec:x.uniProtkbId, org:x.organism?.scientificName,
    fn:x.proteinDescription?.recommendedName?.fullName?.value
  })) });
}
