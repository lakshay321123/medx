export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const translationCache = new Map<
  string,
  { expires: number; data: Partial<Record<DrawerField, string>> }
>();

const CLINICAL_CODES = [
  "HbA1c",
  "LDL",
  "HDL",
  "CRP",
  "ALT",
  "AST",
  "eGFR",
  "ESR",
  "RBC",
  "WBC",
  "TSH",
  "T3",
  "T4",
  "ALP",
  "GGT",
  "CK",
  "LDH",
];

const UNIT_PATTERN = /(?>[<>]=?\s*)?\b\d+(?:[.,]\d+)?\s?(?:mg\/dL|mmol\/L|bpm|cm|kg|mmHg|%)\b/gi;
const RANGE_PATTERN = /(?>[<>]=?\s*)?\b\d{1,4}(?:[.,]\d+)?(?:\s?(?:-|–|\/)\s?\d{1,4}(?:[.,]\d+)?)?\b/g;
const CLINICAL_CODE_PATTERN = new RegExp(`\\b(${CLINICAL_CODES.join("|")})\\b`, "gi");

type DrawerField = "summaryLong" | "summaryShort" | "text" | "valueText";

type PreparedBlock = {
  key: DrawerField;
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

const PLACEHOLDER_PREFIX = "__MEDX_PROTECTED_";

function protectText(text: string) {
  const replacements: string[] = [];
  const protect = (pattern: RegExp) => {
    return (input: string) =>
      input.replace(pattern, match => {
        const placeholder = `${PLACEHOLDER_PREFIX}${replacements.length}__`;
        replacements.push(match);
        return placeholder;
      });
  };

  const applyUnitProtection = protect(UNIT_PATTERN);
  const applyCodeProtection = protect(CLINICAL_CODE_PATTERN);
  const applyRangeProtection = protect(RANGE_PATTERN);

  let sanitized = text;
  sanitized = applyUnitProtection(sanitized);
  sanitized = applyCodeProtection(sanitized);
  sanitized = applyRangeProtection(sanitized);

  return { sanitized, replacements };
}

function restoreText(text: string, replacements: string[]) {
  return replacements.reduce(
    (acc, value, index) => acc.replaceAll(`${PLACEHOLDER_PREFIX}${index}__`, value),
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

  const url = new URL(req.url);
  const searchLang = url.searchParams.get("lang");
  const id = body?.id ? String(body.id) : null;
  const langRaw = body?.lang ?? searchLang ?? "en";
  const lang = String(langRaw || "en").toLowerCase();

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
  const contentHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(base).map(([key, value]) => [key, typeof value === "string" ? value : null]),
      ),
    )
    .digest("hex");

  if (lang !== "en") {
    const prepared: PreparedBlock[] = [];
    (Object.entries(base) as [DrawerField, string | null][]).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        const { sanitized, replacements } = protectText(value);
        prepared.push({ key, sanitized, replacements });
      }
    });

    if (prepared.length) {
      const cacheKey = `${id}:${lang}:${contentHash}`;
      const cached = translationCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        Object.assign(translated, cached.data);
      } else {
        if (cached && cached.expires <= Date.now()) {
          translationCache.delete(cacheKey);
        }
        try {
          const res = await fetch(`${url.origin}/api/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ textBlocks: prepared.map(p => p.sanitized), target: lang }),
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
            const translatedBlocks: Partial<Record<DrawerField, string>> = {};
            prepared.forEach((item, index) => {
              const candidate = typeof blocks[index] === "string" ? blocks[index] : "";
              if (candidate && candidate.trim()) {
                translatedBlocks[item.key] = restoreText(candidate, item.replacements);
              }
            });
            if (Object.keys(translatedBlocks).length) {
              translationCache.set(cacheKey, {
                expires: Date.now() + CACHE_TTL_MS,
                data: translatedBlocks,
              });
              Object.assign(translated, translatedBlocks);
            }
          }
        } catch (err) {
          console.warn("[timeline/summary] translation failed", err);
        }
      }
    }
  }

  return NextResponse.json(
    {
      id,
      summaryLong,
      summaryShort,
      text,
      valueText,
      summaryLongLocalized: translated.summaryLong ?? null,
      summaryShortLocalized: translated.summaryShort ?? null,
      textLocalized: translated.text ?? null,
      valueTextLocalized: translated.valueText ?? null,
      summaryLocalized: translated.summaryLong ?? translated.summaryShort ?? null,
      fullTextLocalized: translated.text ?? null,
    },
    { headers: NO_STORE },
  );
}
