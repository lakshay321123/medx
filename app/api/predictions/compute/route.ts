export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "deprecated" }, { status: 410 });
}
