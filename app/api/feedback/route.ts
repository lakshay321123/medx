import { NextResponse } from "next/server";
// import { MessageStore } from "@/server/store";

export async function POST(req: Request) {
  const { threadId, messageId, reaction } = await req.json();
  if (!threadId || !messageId || !reaction) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  try {
    // await MessageStore.addFeedback({ threadId, messageId, reaction });
    // Optional: insert a lightweight assistant ack message:
    // await MessageStore.insert({
    //   id: crypto.randomUUID(),
    //   role: "assistant",
    //   threadId,
    //   text:
    //     reaction === "up"
    //       ? "Glad that helped! Want to go deeper or try something else?"
    //       : "Thanks for the feedback. I’ll adjust.",
    // });
  } catch (e) {
    console.error("[feedback] error", e);
  }

  return NextResponse.json({ ok: true });
}
