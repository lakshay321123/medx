import { NextResponse } from "next/server";
import { aiJson } from "@/lib/ai";
import { dbEnabled, getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExtractionResult = {
  payer_name: string;
  claim_id: string;
  denial_reason_code: string;
  denial_reason_text: string;
  appeal_possible: boolean;
  raw_excerpt?: string | null;
};

function toUuidOrNull(value: string | undefined | null): string | null {
  if (!value) return null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { text, fileId, prompt } = body;

  if (!text)
    return NextResponse.json({ ok: false, message: "text is required" }, { status: 400 });

  if (!fileId)
    return NextResponse.json({ ok: false, message: "fileId is required" }, { status: 400 });

  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDb();

    const basePrompt = `
You are an expert in parsing medical Explanation of Benefits (EOB).

Extract:
- payer_name
- claim_id
- denial_reason_code
- denial_reason_text
- appeal_possible
- raw_excerpt (1-2 line summary)

Respond ONLY in JSON with exactly those keys.
EOB TEXT:
${text}
    `.trim();

    const fullPrompt = prompt ? `${prompt}\n\n${basePrompt}` : basePrompt;

    const parsed = await aiJson<ExtractionResult>(
      fullPrompt,
      `{
        "payer_name":"string",
        "claim_id":"string",
        "denial_reason_code":"string",
        "denial_reason_text":"string",
        "appeal_possible":true,
        "raw_excerpt":"string"
      }`,
      { mode: "core", max: 900 },
    );

    const payer = parsed?.payer_name?.trim() ?? "";
    const claim = parsed?.claim_id?.trim() ?? "";
    const code = parsed?.denial_reason_code?.trim() ?? "";
    const reason = parsed?.denial_reason_text?.trim() ?? "";
    const possible = Boolean(parsed?.appeal_possible);
    const excerpt = parsed?.raw_excerpt ?? null;

    const dbFileId = toUuidOrNull(fileId);

    await db.query(
      `
      insert into eob_extractions
        (file_id, payer_name, claim_id, denial_reason_code, denial_reason_text, appeal_possible, raw_excerpt)
      values ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        dbFileId,
        payer || null,
        claim || null,
        code || null,
        reason || null,
        possible,
        excerpt,
      ],
    );

    return NextResponse.json({
      ok: true,
      inserted: {
        payer,
        claim,
        code,
        reason,
        possible,
      },
    });
  } catch (err: any) {
    console.error("extract-eob error:", err.message);
    return NextResponse.json(
      { ok: false, message: err.message },
      { status: 500 },
    );
  }
}
