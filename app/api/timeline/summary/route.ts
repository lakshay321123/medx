export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
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

function splitForTranslation(raw: string): { blocks: string[]; separators: string[] } {
  // Split by newline boundaries, but remember separators so we can stitch the text back exactly.
  const parts = raw.split(/(\n+)/); // this keeps newline groups as separate items
  const blocks: string[] = [];
  const separators: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) blocks.push(parts[i]); // text chunk
    else separators.push(parts[i]); // the newline(s)
  }
  return { blocks, separators };
}

function joinWithSeparators(chunks: string[], separators: string[]): string {
  let out = "";
  for (let i = 0; i < chunks.length; i++) {
    out += chunks[i];
    if (i < separators.length) out += separators[i];
  }
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

  const data: TimelineSummaryData = {
    id: String(row?.id ?? id),
    summaryLong: summaryLong ?? null,
    summaryShort: summaryShort ?? null,
    text: text ?? null,
    valueText: valueText ?? null,
    summary: String(summarySource ?? ""),
    fullText: String(fullTextSource ?? ""),
    summary_display: String(summarySource ?? ""),
    fullText_display: String(fullTextSource ?? ""),
  };

  const hasTranslatableContent = Boolean(
    (data.summary && data.summary.trim()) ||
      (data.fullText && data.fullText.trim()),
  );

  if (lang !== "en" && hasTranslatableContent) {
    const url = new URL(req.url);

    // Prepare guards: measurements (existing) + formatting (new)
    const guardsMeas = [data.summary, data.fullText].map(block => guardMeasurements(block || ""));
    const guardsFmt = guardsMeas.map(block => guardFormatting(block.masked || ""));

    // Apply formatting guard before splitting
    const maskedSummary = guardsFmt[0].masked;
    const maskedFull = guardsFmt[1].masked;

    // Split by lines/paragraphs to preserve layout
    const S = splitForTranslation(maskedSummary);
    const F = splitForTranslation(maskedFull);

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const request = fetch(`${url.origin}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Translate all chunks, summary first then full text, one big batch
        textBlocks: [...S.blocks, ...F.blocks],
        target: lang,
      }),
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

      if (translatedBlocks.length === S.blocks.length + F.blocks.length) {
        const sBlocks = translatedBlocks.slice(0, S.blocks.length);
        const fBlocks = translatedBlocks.slice(S.blocks.length);

        // Rejoin with original newlines
        let summaryTranslated = joinWithSeparators(sBlocks, S.separators);
        let fullTextTranslated = joinWithSeparators(fBlocks, F.separators);

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
