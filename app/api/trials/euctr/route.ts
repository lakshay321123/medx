import { NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { euctrFeedUrl } from "@/lib/trials_extras";

export async function GET() {
  if (!flags.enableTrialsEUCTR) return NextResponse.json({ disabled: true });
  return NextResponse.json({ url: euctrFeedUrl() });
}
