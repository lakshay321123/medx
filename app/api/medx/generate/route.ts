import { NextRequest, NextResponse } from "next/server";
import { v2Generate } from "@/lib/medx";

async function legacyGenerate(body: any) {
  return { ok: true, legacy: true, body };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (
    process.env.MEDX_MODES_V2 === "on" &&
    ["patient", "doctor", "research"].includes(body.mode)
  ) {
    const data = await v2Generate(body);
    return NextResponse.json(data);
  }
  const legacy = await legacyGenerate(body);
  return NextResponse.json(legacy);
}

