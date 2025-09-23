import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const shareSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().min(1),
  mode: z.enum(["patient", "doctor", "research", "therapy"]),
  research: z.boolean().optional(),
});

function randomSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const payload = parsed.data;
    const supabase = supabaseServer();
    let attempts = 0;

    while (attempts < 5) {
      const slug = randomSlug();
      const { error } = await supabase
        .from("shared_answers")
        .insert({
          slug,
          conversation_id: payload.conversationId,
          message_id: payload.messageId,
          content: payload.content,
          mode: payload.mode,
          research: payload.research ?? false,
        });
      if (!error) {
        return NextResponse.json({ ok: true, slug });
      }
      if (error.code !== "23505") {
        console.error("Share insert failed", error);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }
      attempts += 1;
    }

    return NextResponse.json({ ok: false, error: "slug_conflict" }, { status: 500 });
  } catch (err) {
    console.error("Share route error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
