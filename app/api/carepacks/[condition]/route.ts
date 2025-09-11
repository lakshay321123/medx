import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const cache: Record<string, { expires: number; data: any }> = {};

async function loadPack(condition: string, lang: string) {
  const dir = path.join(process.cwd(), "data", "carepacks");
  const indexPath = path.join(dir, "index.json");
  let allow: string[] = [];
  try {
    const idx = JSON.parse(await fs.readFile(indexPath, "utf8"));
    allow = Array.isArray(idx.conditions) ? idx.conditions : [];
  } catch {
    return null;
  }
  if (!allow.includes(condition)) return null;
  try {
    const raw = JSON.parse(await fs.readFile(path.join(dir, `${condition}.json`), "utf8"));
    const defLang = process.env.CARE_PACKS_DEFAULT_LANG || "en";
    const data = raw[lang] || raw[defLang];
    if (!data) return null;
    return {
      sections: [
        { type: "summary", title: data.summary.title, items: data.summary.items },
        { type: "labs", title: data.labs.title, labs: data.labs.labs },
        { type: "vaccines", title: data.vaccines.title, items: data.vaccines.items },
        { type: "red_flags", title: data.red_flags.title, items: data.red_flags.items },
      ],
      references: data.references || [],
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { condition: string } }) {
  if (process.env.CARE_PACKS_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { condition } = params;
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") || process.env.CARE_PACKS_DEFAULT_LANG || "en").toLowerCase();
  const region = (url.searchParams.get("region") || "").toUpperCase();
  const key = `${condition}:${lang}:${region}`;
  const start = Date.now();
  let data = cache[key];
  let cached = false;
  if (data && data.expires > Date.now()) {
    cached = true;
  } else {
    const pack = await loadPack(condition, lang);
    if (!pack) {
      return NextResponse.json({ error: "condition not found" }, { status: 404 });
    }
    data = { expires: Date.now() + CACHE_TTL_MS, data: pack };
    cache[key] = data;
  }
  console.log({ condition, lang, region, cached, ms: Date.now() - start });
  const out = data.data;
  return NextResponse.json({
    meta: { condition, lang, region, cached },
    sections: out.sections,
    references: out.references,
  });
}
