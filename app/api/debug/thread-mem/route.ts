export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getMemByThread } from "@/lib/aidoc/memory";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId") || "";
  const mem = await getMemByThread(threadId);
  return NextResponse.json({ threadId, mem });
}
