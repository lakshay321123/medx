export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";
import { langBase } from "@/lib/i18n/langBase";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const measurementPatterns: RegExp[] = [
  /\b\d+(?:[.,]\d+)?(?:\s?(?:[a-zA-Zµμ°%]+(?:\/[a-zA-Zµμ°%]+)?|per\s+[a-zA-Z]+))+\b/g,
  /\b\d+(?:[.,]\d+)?\s*(?:-|to)\s*\d+(?:[.,]\d+)?\b/g,
  /\b\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?\b/g,
  /\b\d+(?:[.,]\d+)?\s?(?:x|×)\s?10\^\d+\b/gi,
];

type MeasurementMatch = { start: number; end: number; value: string };

function protectMeasurementBlocks(blocks: string[]) {
  let counter = 0;
  const replacements: { placeholder: string; value: string }[] = [];

  const maskedBlocks = blocks.map(block => {
    if (!block) return block;

    const matchesMap = new Map<string, MeasurementMatch>();
    for (const pattern of measurementPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(block)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const key = `${start}:${end}`;
        if (!matchesMap.has(key)) {
          matchesMap.set(key, { start, end, value: match[0] });
        }
      }
    }

    const matches = Array.from(matchesMap.values()).sort((a, b) => b.start - a.start);
    let masked = block;
    for (const match of matches) {
      const placeholder = `[[MEDX_MEAS_${counter++}]]`;
      replacements.push({ placeholder, value: match.value });
      masked = masked.slice(0, match.start) + placeholder + masked.slice(match.end);
    }

    return masked;
  });

  const restore = (translated: string[]) =>
    translated.map(block => {
      if (!block) return block;
      let restored = block;
      for (const { placeholder, value } of replacements) {
        if (restored.includes(placeholder)) {
          restored = restored.split(placeholder).join(value);
        }
      }
      return restored;
    });

  return { maskedBlocks, restore };
}

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

async function handleTimelineSummary(
  req: Request,
  idParam: string | null,
  langParam: string | null,
) {
  const requestUrl = new URL(req.url);
  const mode = requestUrl.searchParams.get("mode")?.toLowerCase();
  if (mode !== "ai-doc") {
    return NextResponse.json(
      { ok: false, error: "Timeline summary is available only in AI Doc mode" },
      { status: 403, headers: NO_STORE },
    );
  }

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
    const blocks = [String(data.summary || ""), String(data.fullText || "")];
    const { maskedBlocks, restore } = protectMeasurementBlocks(blocks);

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<{ blocks: string[] }>(resolve => {
      timeoutId = setTimeout(() => {
        controller.abort();
        resolve({ blocks: [] });
      }, 2500);
    });

    const translationPromise = fetch(new URL("/api/translate", requestUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textBlocks: maskedBlocks, target: lang }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(res => (res.ok ? res.json() : { blocks: [] }))
      .catch(err => {
        console.warn("[timeline/summary] translation failed", err);
        return { blocks: [] };
      });

    try {
      const res = (await Promise.race([translationPromise, timeoutPromise])) as {
        blocks: string[];
      };
      const translated = Array.isArray(res.blocks) ? res.blocks : [];
      const restored = restore(translated);

      data.summary_display = restored?.[0]?.trim() || data.summary || "";
      data.fullText_display = restored?.[1]?.trim() || data.fullText || "";
    } finally {
      if (timeoutId !== undefined) {
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
