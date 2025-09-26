import { NextResponse } from "next/server";
import { createShare } from "@/lib/share/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const mode = typeof body?.mode === "string" ? body.mode : undefined;

    if (!content) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    }

    if (content.length > 20000) {
      return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
    }

    const record = createShare(content, mode);
    return NextResponse.json({ ok: true, id: record.id, url: `/s/${record.id}` });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
