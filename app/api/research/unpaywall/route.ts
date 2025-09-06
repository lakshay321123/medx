import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { resolveOAUrl } from "@/lib/unpaywall";

export async function GET(req: NextRequest) {
  if (!flags.enableUnpaywall) return NextResponse.json({ disabled: true });
  const doi = new URL(req.url).searchParams.get("doi") || "";
  if (!doi) return NextResponse.json({ error: "doi required" }, { status: 400 });
  const url = await resolveOAUrl(doi);
  return NextResponse.json({ doi, oa_url: url });
}
