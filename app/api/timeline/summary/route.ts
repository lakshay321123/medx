export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const TRANSLATION_TTL_MS = 24 * 60 * 60 * 1000;

const LAB_TOKEN_LIST = [
  "HbA1c",
  "LDL",
  "HDL",
  "CRP",
  "ALT",
  "AST",
  "eGFR",
  "ESR",
  "BMI",
  "BUN",
  "TSH",
  "T4",
  "T3",
  "WBC",
  "RBC",
  "Hb",
  "A1C",
  "BP",
  "HR",
  "RR",
  "SpO2",
  "Na",
  "K",
  "Cl",
  "Ca",
  "CR",
  "GFR",
  "Glucose",
];

const PROTECTED_REGEX_FACTORIES: Array<() => RegExp> = [
  () =>
    /\b\d{1,4}(?:[.,]\d+)?\s?(?:mg\/dL|mg\/dl|mcg|µg|ug|mmol\/L|mmol\/l|mEq\/L|meq\/l|IU\/L|iu\/l|U\/L|u\/l|bpm|cm|mm|kg|lbs|lb|g\/dL|g\/dl|mL|ml|L|l|%)\b/gi,
  () => /\b\d{1,4}(?:[.,]\d+)?(?:\s?-\s?\d{1,4}(?:[.,]\d+)?)?\b/g,
  () => new RegExp(`\\b(?:${LAB_TOKEN_LIST.join("|")})\\b`, "gi"),
];

type DrawerField = "summaryLong" | "summaryShort" | "text" | "valueText";

type PreparedBlock = {
  key: DrawerField;
  sanitized: string;
  replacements: string[];
};

type TranslationCacheValue = {
  expiresAt: number;
  translated: Partial<Record<DrawerField, string>>;
};

const translationCache = new Map<string, TranslationCacheValue>();

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

function protectText(text: string) {
  if (!text) {
    return { sanitized: text, replacements: [] };
  }
  const segments: { start: number; end: number; value: string }[] = [];
  for (const factory of PROTECTED_REGEX_FACTORIES) {
    const regex = factory();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      if (!value) continue;
      const start = match.index;
      const end = start + value.length;
      if (segments.some(segment => start < segment.end && end > segment.start)) {
        continue;
      }
      segments.push({ start, end, value });
    }
  }
  if (!segments.length) {
    return { sanitized: text, replacements: [] };
  }
  segments.sort((a, b) => a.start - b.start);
  const replacements: string[] = [];
  let cursor = 0;
  let sanitized = "";
  segments.forEach((segment, index) => {
    sanitized += text.slice(cursor, segment.start);
    sanitized += `__MEDX_PROTECTED_${index}__`;
    replacements.push(segment.value);
    cursor = segment.end;
  });
  sanitized += text.slice(cursor);
  return { sanitized, replacements };
}

function restoreText(text: string, replacements: string[]) {
  return replacements.reduce(
    (acc, value, index) => acc.replaceAll(`__MEDX_PROTECTED_${index}__`, value),
    text,
  );
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const id = body?.id ? String(body.id) : null;
  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang");
  const langRaw = (langParam || body?.lang || "en") as string;
  const lang = (langRaw || "en").toLowerCase();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE });
  }

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
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }

  const meta = (row?.meta ?? row?.details ?? {}) as Record<string, any>;

  const summaryLong = firstString(meta.summary_long, meta.summaryLong, row?.summary_long, row?.summaryLong);
  let summaryShort = firstString(meta.summary, meta.summaryShort, row?.summary, row?.summaryShort);
  const text = firstString(meta.text, row?.text);
  const valueText = firstString(row?.value_text, meta.value_text);

  if (!summaryShort && (text || summaryLong)) {
    summaryShort = buildShortSummaryFromText(text ?? undefined, summaryLong ?? undefined) ?? null;
  }

  const base = {
    summaryLong,
    summaryShort,
    text,
    valueText,
  } satisfies Record<DrawerField, string | null>;

  const translated: Partial<Record<DrawerField, string>> = {};

  if (lang !== "en") {
    const hash = createHash("sha256");
    (Object.entries(base) as [DrawerField, string | null][]).forEach(([key, value]) => {
      if (typeof value === "string" && value.length) {
        hash.update(`${key}:${value}\u0000`);
      }
    });
    const contentHash = hash.digest("hex");
    const cacheKey = `${id}:${lang}:${contentHash}`;
    const now = Date.now();
    const cached = translationCache.get(cacheKey);
    let needsTranslation = true;
    if (cached) {
      if (cached.expiresAt > now) {
        Object.assign(translated, cached.translated);
        needsTranslation = false;
      } else {
        translationCache.delete(cacheKey);
      }
    }

    if (needsTranslation) {
      const prepared: PreparedBlock[] = [];
      (Object.entries(base) as [DrawerField, string | null][]).forEach(([key, value]) => {
        if (typeof value === "string" && value.trim()) {
          const { sanitized, replacements } = protectText(value);
          prepared.push({ key, sanitized, replacements });
        }
      });

      if (prepared.length) {
        try {
          const glossary = Array.from(
            new Set(
              prepared.flatMap(block => block.replacements.filter(Boolean)),
            ),
          );
          const response = await fetch(`${url.origin}/api/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              textBlocks: prepared.map(p => p.sanitized),
              target: lang,
              glossary,
            }),
            cache: "no-store",
          });
          if (response.ok) {
            const data = await response.json();
            const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
            prepared.forEach((item, index) => {
              const candidate = typeof blocks[index] === "string" ? blocks[index] : "";
              if (candidate && candidate.trim()) {
                translated[item.key] = restoreText(candidate, item.replacements);
              }
            });
            translationCache.set(cacheKey, {
              expiresAt: now + TRANSLATION_TTL_MS,
              translated: { ...translated },
            });
          } else {
            translationCache.delete(cacheKey);
          }
        } catch (err) {
          console.warn("[timeline/summary] translation failed", err);
          translationCache.delete(cacheKey);
        }
      } else {
        translationCache.set(cacheKey, {
          expiresAt: now + TRANSLATION_TTL_MS,
          translated: {},
        });
      }
    }
  }

  const summaryLongLocalized = translated.summaryLong ?? null;
  const summaryShortLocalized = translated.summaryShort ?? null;
  const textLocalized = translated.text ?? null;
  const valueTextLocalized = translated.valueText ?? null;
  const summaryLocalized = summaryLongLocalized ?? summaryShortLocalized ?? null;
  const fullTextLocalized = textLocalized ?? null;

  return NextResponse.json(
    {
      id,
      summaryLong,
      summaryShort,
      text,
      valueText,
      summaryLocalized,
      summaryLongLocalized,
      summaryShortLocalized,
      fullTextLocalized,
      textLocalized,
      valueTextLocalized,
      translated,
    },
    { headers: NO_STORE },
  );
}
