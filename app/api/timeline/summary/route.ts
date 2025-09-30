export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";
import { langBase } from "@/lib/i18n/langBase";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function firstString(...values: any[]): string | null {
  for (const value of values) {
    if (Array.isArray(value)) {
      const joined = value.join("\n").trim();
      if (joined) return joined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

type TimelineSummaryData = {
  id: string;
  summaryLong: string | null;
  summaryShort: string | null;
  text: string | null;
  valueText: string | null;
  summary: string;
  fullText: string;
  summary_display: string;
  fullText_display: string;
};

type MeasurementPlaceholder = {
  token: string;
  value: string;
};

type GuardedBlock = {
  original: string;
  masked: string;
  placeholders: MeasurementPlaceholder[];
};

const MEASUREMENT_REGEX =
  /\b\d[\d.,]*(?:\s?[\/-]\s?\d[\d.,]*)*(?:\s?(?:%|°[CF]|[a-zA-Zµμ]+(?:\/[a-zA-Z]+)?))*\b/g;

function guardMeasurements(input: string): GuardedBlock {
  const original = String(input ?? "");
  const placeholders: MeasurementPlaceholder[] = [];
  let index = 0;

  const masked = original.replace(MEASUREMENT_REGEX, match => {
    const token = `__MEDX_MEAS_${index++}__`;
    placeholders.push({ token, value: match });
    return token;
  });

  return { original, masked, placeholders };
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// Merge tiny lines so we don’t explode block count
function coalesceLines(input: string, maxChunkLen = 500): string[] {
  const lines = String(input || "").split("\n");
  const out: string[] = [];
  let buf = "";
  for (const line of lines) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length >= maxChunkLen) {
      if (buf) out.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function guardFormatting(block: string) {
  // Protect common list markers so MT doesn’t drop them.
  // We replace leading markers with tokens and restore later.
  const lines = String(block ?? "").split("\n");
  const placeholders: { token: string; value: string }[] = [];
  const guarded = lines
    .map((line, idx) => {
      const m = line.match(/^(\s*)([-*•]\s+|\d+\.\s+)/);
      if (!m) return line;
      const token = `__MEDX_LM_${idx}__`;
      placeholders.push({ token, value: m[1] + m[2] });
      return token + line.slice(m[0].length);
    })
    .join("\n");
  return { masked: guarded, placeholders };
}

function restoreFormatting(translated: string, ph: { token: string; value: string }[]) {
  let s = String(translated ?? "");
  for (const { token, value } of ph) {
    s = s.split(token).join(value);
  }
  return s;
}

function restoreMeasurements(translated: string, guard: GuardedBlock) {
  let restored = String(translated ?? "");
  for (const { token, value } of guard.placeholders) {
    if (!token) continue;
    restored = restored.split(token).join(value);
  }
  return restored;
}

async function handleTimelineSummary(
  req: Request,
  idParam: string | null,
  langParam: string | null,
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  const id = idParam ? String(idParam) : null;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "id required" },
      { status: 400, headers: NO_STORE },
    );
  }

  const lang = langBase(langParam || undefined);

  const sb = supabaseAdmin();
  const { data: obsRow } = await sb
    .from("observations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  let row = obsRow;
  if (!row) {
    const { data: predRow } = await sb
      .from("predictions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    row = predRow || null;
  }

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404, headers: NO_STORE },
    );
  }

  const meta = (row?.meta ?? row?.details ?? {}) as Record<string, any>;

  const summaryLong = firstString(
    meta.summary_long,
    meta.summaryLong,
    row?.summary_long,
    row?.summaryLong,
  );
  let summaryShort = firstString(
    meta.summary,
    meta.summaryShort,
    row?.summary,
    row?.summaryShort,
  );
  const text = firstString(meta.text, row?.text);
  const valueText = firstString(row?.value_text, meta.value_text);

  if (!summaryShort && (text || summaryLong)) {
    summaryShort =
      buildShortSummaryFromText(text ?? undefined, summaryLong ?? undefined) ?? null;
  }

  const summarySource =
    summaryLong ??
    summaryShort ??
    valueText ??
    text ??
    "";
  const fullTextSource = text ?? valueText ?? "";

  const englishSummary = String(summarySource ?? "");
  const englishFull = String(fullTextSource ?? "");
  const englishSnapshot = `${englishSummary}\n---\n${englishFull}`;
  const englishHash = sha256(englishSnapshot);

  const data: TimelineSummaryData = {
    id: String(row?.id ?? id),
    summaryLong: summaryLong ?? null,
    summaryShort: summaryShort ?? null,
    text: text ?? null,
    valueText: valueText ?? null,
    summary: englishSummary,
    fullText: englishFull,
    summary_display: englishSummary,
    fullText_display: englishFull,
  };

  // Attempt DB cache read
  try {
    const sb = supabaseAdmin();
    const { data: cachedRows } = await sb
      .from("timeline_translations")
      .select("summary_display, fulltext_display, updated_at")
      .eq("observation_id", id)
      .eq("lang", lang)
      .eq("english_hash", englishHash)
      .limit(1);

    if (Array.isArray(cachedRows) && cachedRows.length) {
      const row = cachedRows[0];
      return NextResponse.json(
        {
          ok: true,
          data: {
            id: data.id,
            summaryLong: summaryLong ?? null,
            summaryShort: summaryShort ?? null,
            text: text ?? null,
            valueText: valueText ?? null,
            summary: englishSummary,
            fullText: englishFull,
            summary_display: row.summary_display || englishSummary,
            fullText_display: row.fulltext_display || englishFull,
          },
        },
        { headers: NO_STORE },
      );
    }
  } catch (e) {
    console.warn("[timeline/summary] cache read failed", e);
  }

  const hasTranslatableContent = Boolean(
    (data.summary && data.summary.trim()) ||
      (data.fullText && data.fullText.trim()),
  );

  if (lang !== "en" && hasTranslatableContent) {
    const url = new URL(req.url);

    // Prepare guards: measurements (existing) + formatting (new)
    const guardsMeas = [data.summary, data.fullText].map(block => guardMeasurements(block || ""));
    const guardsFmt = guardsMeas.map(block => guardFormatting(block.masked || ""));

    // Coalesce to preserve structure but reduce block count
    const sumChunks = coalesceLines(guardsFmt[0].masked, 500);
    const fullChunks = coalesceLines(guardsFmt[1].masked, 500);

    const MAX = 64;
    const combinedChunks = [...sumChunks, ...fullChunks];
    const cappedChunks = combinedChunks.slice(0, MAX);
    const summaryChunkCount = Math.min(sumChunks.length, cappedChunks.length);
    const fullChunkCount = Math.max(0, cappedChunks.length - summaryChunkCount);
    const summaryChunksToTranslate = sumChunks.slice(0, summaryChunkCount);
    const fullChunksToTranslate = fullChunks.slice(0, fullChunkCount);

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (cappedChunks.length === 0) {
      data.summary_display = data.summary || "";
      data.fullText_display = data.fullText || "";
    } else {
      const request = fetch(`${url.origin}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textBlocks: cappedChunks, target: lang }),
        cache: "no-store",
        signal: controller.signal,
      })
        .then(res => (res.ok ? res.json() : { blocks: [] }))
        .catch(() => ({ blocks: [] }));

      const timeout = new Promise<{ blocks: string[] }>(resolve => {
        timeoutId = setTimeout(() => {
          resolve({ blocks: [] });
        }, 6500);
      });

      try {
        const res = (await Promise.race([request, timeout])) as any;
        const translatedBlocks: string[] = Array.isArray(res?.blocks) ? res.blocks : [];

        if (translatedBlocks.length === cappedChunks.length) {
          const translatedSummaryBlocks = translatedBlocks.slice(0, summaryChunksToTranslate.length);
          const translatedFullBlocks = translatedBlocks.slice(summaryChunksToTranslate.length);

          let summaryTranslated = translatedSummaryBlocks.join("\n");
          let fullTextTranslated = translatedFullBlocks.join("\n");

          if (sumChunks.length > summaryChunksToTranslate.length) {
            const remainder = sumChunks.slice(summaryChunksToTranslate.length).join("\n");
            if (remainder) {
              summaryTranslated = summaryTranslated
                ? `${summaryTranslated}\n${remainder}`
                : remainder;
            }
          }

          if (fullChunks.length > fullChunksToTranslate.length) {
            const remainder = fullChunks.slice(fullChunksToTranslate.length).join("\n");
            if (remainder) {
              fullTextTranslated = fullTextTranslated
                ? `${fullTextTranslated}\n${remainder}`
                : remainder;
            }
          }

          // Restore formatting placeholders then measurements
          summaryTranslated = restoreMeasurements(
            restoreFormatting(summaryTranslated, guardsFmt[0].placeholders),
            guardsMeas[0],
          ).trim();

          fullTextTranslated = restoreMeasurements(
            restoreFormatting(fullTextTranslated, guardsFmt[1].placeholders),
            guardsMeas[1],
          ).trim();

          data.summary_display = summaryTranslated || data.summary || "";
          data.fullText_display = fullTextTranslated || data.fullText || "";

          // Upsert into DB cache
          try {
            const sb = supabaseAdmin();
            await sb.from("timeline_translations").upsert({
              observation_id: id,
              lang,
              english_hash: englishHash,
              summary_display: data.summary_display || englishSummary,
              fulltext_display: data.fullText_display || englishFull,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("[timeline/summary] cache write failed", e);
          }
        } else {
          // fallback to original if batch shape mismatched
          data.summary_display = data.summary || "";
          data.fullText_display = data.fullText || "";
        }
      } catch (err) {
        console.warn("[timeline/summary] translation failed", err);
        data.summary_display = data.summary || "";
        data.fullText_display = data.fullText || "";
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        controller.abort();
      }
    }
  } else {
    data.summary_display = data.summary || "";
    data.fullText_display = data.fullText || "";
  }

  return NextResponse.json(
    { ok: true, data },
    { headers: NO_STORE },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const lang = url.searchParams.get("lang");
  return handleTimelineSummary(req, id, lang);
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const id = body?.id ? String(body.id) : null;
  const lang = body?.lang ? String(body.lang) : null;
  return handleTimelineSummary(req, id, lang);
}
