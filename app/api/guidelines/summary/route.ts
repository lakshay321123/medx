export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ENABLED = String(process.env.GUIDELINE_SUMMARIES || "").toLowerCase() === "true";
const DEFAULT_LANG = process.env.GUIDELINE_DEFAULT_LANG || "en";
const TTL = 10 * 60 * 1000;
const cache = new Map<string, { data: any; ts: number }>();
const noStore = { "Cache-Control": "no-store, max-age=0" };

async function loadJSON(file: string) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export async function GET(req: NextRequest) {
  if (!ENABLED)
    return NextResponse.json({ error: "Guideline summaries disabled" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const slug = String(searchParams.get("slug") || "").trim();
  let lang = String(searchParams.get("lang") || DEFAULT_LANG).trim();
  const indexPath = path.join(process.cwd(), "data/guidelines/index.json");
  let index: Record<string, string> = {};
  try {
    index = await loadJSON(indexPath);
  } catch {
    return NextResponse.json({ error: "index missing" }, { status: 500 });
  }
  const fileBase = index[slug];
  if (!fileBase) return NextResponse.json({ error: "not found" }, { status: 404 });

  const key = `${fileBase}:${lang}`;
  const now = Date.now();
  let entry = cache.get(key);
  let data: any;
  let cached = false;
  if (entry && now - entry.ts < TTL) {
    data = entry.data;
    cached = true;
  } else {
    try {
      const file = path.join(process.cwd(), `data/guidelines/${fileBase}.${lang}.json`);
      data = await loadJSON(file);
    } catch {
      if (lang !== DEFAULT_LANG) {
        lang = DEFAULT_LANG;
        try {
          const file = path.join(process.cwd(), `data/guidelines/${fileBase}.${lang}.json`);
          data = await loadJSON(file);
        } catch {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
    }
    cache.set(`${fileBase}:${lang}`, { data, ts: now });
  }

  const bullets = Array.isArray(data.bullets) ? data.bullets.slice(0, 5) : [];
  const references = Array.isArray(data.refs) ? data.refs : [];
  if (bullets.length === 0 || references.length === 0)
    return NextResponse.json({ error: "invalid guideline file" }, { status: 500 });

  console.log(JSON.stringify({ slug, lang, cached }));
  return NextResponse.json(
    { meta: { slug, lang }, title: data.title || "", bullets, references },
    { headers: noStore }
  );
}
