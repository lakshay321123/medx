export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { saveThread, saveMessage } from "@/lib/chat/persistence";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { threadId, title, mode, role, content } = body;

  if (!threadId || !content) {
    return NextResponse.json({ error: "threadId and content required" }, { status: 400 });
  }

  try {
    // Save/update thread
    if (title || mode) {
      await saveThread(userId, threadId, title || "New chat", mode || "wellness");
    }
    // Save message
    if (role && content) {
      await saveMessage(threadId, role, content);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Save failed" }, { status: 500 });
  }
}
