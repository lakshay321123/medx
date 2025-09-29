export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const PROTECTED_UNIT = /^(?:mg\/dl|mmol\/l|bpm|cm|kg|%)$/i;

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

function protectText(text: string) {
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
  const langRaw = body?.lang ? String(body.lang) : "en";
  const lang = langRaw || "en";

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

  if (lang.toLowerCase() !== "en") {
    const prepared: PreparedBlock[] = [];
    (Object.entries(base) as [DrawerField, string | null][]).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        const { sanitized, replacements } = protectText(value);
        prepared.push({ key, sanitized, replacements });
      }
    });

    if (prepared.length) {
      const url = new URL(req.url);
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
          prepared.forEach((item, index) => {
            const candidate = typeof blocks[index] === "string" ? blocks[index] : "";
            if (candidate && candidate.trim()) {
              translated[item.key] = restoreText(candidate, item.replacements);
            }
          });
        }
      } catch (err) {
        console.warn("[timeline/summary] translation failed", err);
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
      translated,
    },
    { headers: NO_STORE },
  );
}
