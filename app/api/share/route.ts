import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const shareSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  plainText: z.string().min(1),
  mdText: z.string().optional(),
  mode: z.enum(["patient", "doctor", "research", "therapy"]),
  research: z.boolean().optional(),
});

function randomSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

const FALLBACK_MESSAGE = "Shared response unavailable.";

function buildAbsoluteUrl(slug: string) {
  const headerStore = headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
    null;

  if (!host) {
    return `/s/${slug}`;
  }

  const normalizedHost = host.replace(/\/$/, "");
  return `${proto}://${normalizedHost}/s/${slug}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const payload = parsed.data;
    const supabase = supabaseAdmin();
    let attempts = 0;

    while (attempts < 5) {
      const slug = randomSlug();

      const safePlain = payload.plainText.trim();
      const safeMd = payload.mdText?.trim() ?? "";
      const hasPlain = safePlain.length > 0;
      const hasMd = safeMd.length > 0;

      const plainTextValue = hasPlain ? safePlain : hasMd ? safeMd : FALLBACK_MESSAGE;
      const markdownValue = hasMd ? safeMd : plainTextValue;

      const insertPayload: Record<string, unknown> = {
        slug,
        conversation_id: payload.conversationId,
        message_id: payload.messageId,
        plain_text: plainTextValue,
        md_text: markdownValue,
        mode: payload.mode,
        research: payload.research ?? false,
      };

      const { error } = await supabase.from("shared_answers").insert(insertPayload);
      if (!error) {
        const absoluteUrl = buildAbsoluteUrl(slug);
        return NextResponse.json({ slug, absoluteUrl }, { status: 201 });
      }
      if (error.code !== "23505") {
        console.error("Share insert failed", error);
        const diagEnabled = process.env.SHOW_SHARE_DIAG === "1";
        const payload: Record<string, unknown> = { ok: false, error: "db_error" };
        if (diagEnabled) {
          payload.dbCode = error.code ?? null;
          payload.dbMessage = error.message ?? null;
        }
        return NextResponse.json(payload, { status: 500 });
      }
      attempts += 1;
    }

    return NextResponse.json({ ok: false, error: "slug_conflict" }, { status: 500 });
  } catch (err) {
    console.error("Share route error", err);
    const diagEnabled = process.env.SHOW_SHARE_DIAG === "1";
    const payload: Record<string, unknown> = { ok: false, error: "server_error" };
    if (diagEnabled && err && typeof err === "object") {
      payload.dbMessage = (err as Error).message ?? null;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
