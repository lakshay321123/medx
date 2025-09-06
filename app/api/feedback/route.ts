import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const schema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  rating: z.enum(["up", "down"]),
  note: z.string().max(400).optional(),
  mode: z.enum(["patient", "doctor", "research", "therapy"]).optional(),
  model: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    const { conversationId, messageId, rating, note, mode, model, userId } = parsed.data;

    const { error } = await supabaseServer().from("ai_feedback").upsert(
      {
        conversation_id: conversationId,
        message_id: messageId,
        rating: rating === "up" ? 1 : -1,
        note: note ?? null,
        mode: mode ?? null,
        model: model ?? null,
        user_id: userId ?? null,
      },
      { onConflict: "conversation_id,message_id" }
    );

    if (error) {
      console.error("Feedback insert error", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Feedback route error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
