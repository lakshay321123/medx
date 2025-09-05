import { NextResponse } from "next/server";
import { parseAndValidateFromReply } from "@/lib/ai/validate";

export async function POST(req: Request) {
  const { reply } = await req.json();
  const result = parseAndValidateFromReply(reply);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
