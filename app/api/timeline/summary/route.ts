export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";
import { langBase } from "@/lib/i18n/langBase";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const PROTECTED_UNIT = /^(?:mg\/dl|mmol\/l|bpm|cm|kg|%)$/i;

type ProtectedBlock = {
  sanitized: string;
  replacements: string[];
};

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

function protectText(text: string): ProtectedBlock {
  const tokens = text.split(/(\s+)/);
  const replacements: string[] = [];

  const sanitizedTokens = tokens.map(token => {
    if (!token.trim()) return token;
    if (/^\d/.test(token) || PROTECTED_UNIT.test(token)) {
      const placeholder = `__MEDX_PROTECTED_${replacements.length}__`;
      replacements.push(token);
      return placeholder;
    }
    return token;
  });

  return { sanitized: sanitizedTokens.join(""), replacements };
}

function restoreText(text: string, replacements: string[]): string {
  return replacements.reduce(
    (acc, value, index) => acc.replaceAll(`__MEDX_PROTECTED_${index}__`, value),
    text,
  );
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
    const preparedBlocks = [
      protectText(String(data.summary || "")),
      protectText(String(data.fullText || "")),
    ];
    const blocks = preparedBlocks.map(block => block.sanitized);

    const p = fetch(`${url.origin}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textBlocks: blocks, target: lang }),
      cache: "no-store",
    });

    try {
      // 2.5s cap for modal
      const res = (await Promise.race([
        p.then(r => (r.ok ? r.json() : { blocks: [] })),
        new Promise(resolve => setTimeout(() => resolve({ blocks: [] }), 2500)),
      ])) as { blocks: string[] };

      const summaryCandidate = restoreText(
        typeof res.blocks?.[0] === "string" ? res.blocks[0] : "",
        preparedBlocks[0].replacements,
      ).trim();
      const fullTextCandidate = restoreText(
        typeof res.blocks?.[1] === "string" ? res.blocks[1] : "",
        preparedBlocks[1].replacements,
      ).trim();

      data.summary_display = summaryCandidate || data.summary || "";
      data.fullText_display = fullTextCandidate || data.fullText || "";
    } catch (err) {
      console.warn("[timeline/summary] translation failed", err);
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
