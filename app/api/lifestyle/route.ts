import { NextRequest, NextResponse } from "next/server";
import { detectLifestyleQuery, getLifestyleTips } from "@/lib/lifestyleTips";

export async function POST(req: NextRequest) {
  if (process.env.LIFESTYLE_TIPS_ENABLED !== "true") {
    return NextResponse.json({ disabled: true });
  }
  const { text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (!detectLifestyleQuery(text)) {
    return NextResponse.json({ match: false });
  }
  return NextResponse.json(getLifestyleTips());
}
