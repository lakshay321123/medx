import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.titleHint === "string" ? body.titleHint : typeof body?.title === "string" ? body.title : "New chat";
  const id = crypto.randomUUID();
  return NextResponse.json({ id, title });
}
