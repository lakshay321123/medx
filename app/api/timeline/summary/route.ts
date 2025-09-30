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

    const guards = [data.summary, data.fullText].map(block => guardMeasurements(block || ""));
    const maskedBlocks = guards.map(block => block.masked);

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const request = fetch(`${url.origin}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textBlocks: maskedBlocks, target: lang }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(res => (res.ok ? res.json() : { blocks: [] }))
      .catch(() => ({ blocks: [] }));

    const timeout = new Promise<{ blocks: string[] }>(resolve => {
      timeoutId = setTimeout(() => {
        controller.abort();
        resolve({ blocks: [] });
      }, 2500);
    });

    try {
      const res = (await Promise.race([request, timeout])) as { blocks: string[] };
      const translatedBlocks = Array.isArray(res.blocks) ? res.blocks : [];

      const summaryTranslated = translatedBlocks[0]
        ? restoreMeasurements(translatedBlocks[0], guards[0]).trim()
        : "";
      const fullTextTranslated = translatedBlocks[1]
        ? restoreMeasurements(translatedBlocks[1], guards[1]).trim()
        : "";

      data.summary_display = summaryTranslated || data.summary || "";
      data.fullText_display = fullTextTranslated || data.fullText || "";
    } catch (err) {
      console.warn("[timeline/summary] translation failed", err);
      data.summary_display = data.summary || "";
      data.fullText_display = data.fullText || "";
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
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
