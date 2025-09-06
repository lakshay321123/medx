import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { medlinePlusByICD } from "@/lib/medlineplus";

export async function GET(req: NextRequest) {
  if (!flags.enableMedlinePlus) return NextResponse.json({ disabled: true });
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const dn = url.searchParams.get("dn") || undefined;
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  const xml = await medlinePlusByICD(code, dn);
  return NextResponse.json({ xml });
}
