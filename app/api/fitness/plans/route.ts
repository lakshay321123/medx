export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ENABLED = String(process.env.FITNESS_REHAB_PLANS || "").toLowerCase() === "true";
const DEFAULT_LANG = process.env.TEMPLATES_DEFAULT_LANG || "en";
const TTL = 10 * 60 * 1000;
const cache = new Map<string, { data: any; ts: number }>();
const noStore = { "Cache-Control": "no-store, max-age=0" };

async function loadJSON(file: string) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export async function GET(req: NextRequest) {
  if (!ENABLED)
    return NextResponse.json({ error: "Fitness plans disabled" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const condition = String(searchParams.get("condition") || "").trim();
  let lang = String(searchParams.get("lang") || DEFAULT_LANG).trim();
  const indexPath = path.join(process.cwd(), "data/plans/index.json");
  let index: any = {};
  try {
    index = await loadJSON(indexPath);
  } catch {}
  if (!Array.isArray(index.fitness) || !index.fitness.includes(condition))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const key = `fitness:${condition}:${lang}`;
  const now = Date.now();
  let entry = cache.get(key);
  let data: any;
  if (entry && now - entry.ts < TTL) {
    data = entry.data;
  } else {
    try {
      const file = path.join(process.cwd(), `data/plans/fitness/${condition}.${lang}.json`);
      data = await loadJSON(file);
    } catch {
      if (lang !== DEFAULT_LANG) {
        lang = DEFAULT_LANG;
        try {
          const file = path.join(
            process.cwd(),
            `data/plans/fitness/${condition}.${lang}.json`
          );
          data = await loadJSON(file);
        } catch {
          return NextResponse.json({ error: "not found" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
    }
    cache.set(`fitness:${condition}:${lang}`, { data, ts: now });
  }

  if (!data.title || Object.keys(data).length < 2)
    return NextResponse.json({ error: "invalid plan" }, { status: 500 });

  return NextResponse.json(
    { meta: { condition, lang }, plan: data },
    { headers: noStore }
  );
}
