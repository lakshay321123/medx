import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { groqChat, openaiText, ChatMsg } from "@/lib/llm";
import { getDailyMed } from "@/lib/dailymed";
import { getRxCUI } from "@/lib/rxnorm";

const FILE_CACHE_ENABLED =
  (process.env.MEDS_FILE_CACHE || "true").toLowerCase() === "true";
const CACHE_DIR = path.join(
  process.cwd(),
  process.env.MEDS_CACHE_DIR || "data/meds_cache"
);
const TTL_DAYS = Number(process.env.MEDS_CACHE_TTL_DAYS || 90);
const MAX_BYTES =
  Number(process.env.MEDS_CACHE_MAX_MB || 200) * 1024 * 1024;
const SOURCE_VERSION = process.env.MEDS_SOURCE_VERSION || "1";

type CachePayload = { card: any; meta: any };
type CacheEntry = { payload: CachePayload; expires_at: number };
const memCache = new Map<string, CacheEntry>();

const ALIASES: Record<string, string> = {
  tylenol: "acetaminophen",
  crocin: "paracetamol",
};

async function normalize(name: string): Promise<{ slug: string; canonical: string }> {
  const lowered = name.toLowerCase();
  const aliased = ALIASES[lowered] || name;
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(aliased)}&maxEntries=1`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.ok) {
      const j = await r.json();
      const cand = j?.approximateGroup?.candidate?.[0]?.candidate;
      if (cand) {
        const slug = String(cand).toLowerCase();
        return { slug, canonical: String(cand) };
      }
    }
  } catch {
    // ignore
  }
  // fallback: use aliased name if it looks word-ish
  if (/^[a-z][a-z0-9-\s]{2,}$/i.test(aliased)) {
    const slug = aliased.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return { slug, canonical: aliased };
  }
  throw new Error("normalize_failed");
}

function getCacheKey(slug: string, country: string) {
  const input = `${slug}|${country}|${SOURCE_VERSION}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function trimCache() {
  if (!FILE_CACHE_ENABLED) return;
  try {
    const files = await fs.readdir(CACHE_DIR);
    const stats = await Promise.all(
      files.map(async (f) => {
        const fp = path.join(CACHE_DIR, f);
        const s = await fs.stat(fp);
        return { fp, mtime: s.mtimeMs, size: s.size };
      })
    );
    let total = stats.reduce((acc, s) => acc + s.size, 0);
    if (total <= MAX_BYTES) return;
    stats.sort((a, b) => a.mtime - b.mtime);
    for (const s of stats) {
      await fs.unlink(s.fp).catch(() => {});
      total -= s.size;
      if (total <= MAX_BYTES) break;
    }
    console.log("meds_cache_trim", { mb: Math.round(total / 1024 / 1024) });
  } catch (e) {
    console.warn("meds_cache_trim_fail", e);
  }
}

async function readCache(key: string): Promise<CachePayload | null> {
  const now = Date.now();
  const mem = memCache.get(key);
  if (mem && mem.expires_at > now) {
    console.log("meds_cache_hit_mem", { key });
    return mem.payload;
  }
  if (!FILE_CACHE_ENABLED) return null;
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    const raw = await fs.readFile(p, "utf8");
    const data = JSON.parse(raw) as CacheEntry & { fetched_at?: number };
    if (now < data.expires_at) {
      memCache.set(key, { payload: data.payload, expires_at: data.expires_at });
      await fs.utimes(p, new Date(), new Date()).catch(() => {});
      console.log("meds_cache_hit_file", { key });
      return data.payload;
    }
    await fs.unlink(p).catch(() => {});
  } catch (e) {
    // corrupt JSON or other read issues
    await fs.unlink(path.join(CACHE_DIR, `${key}.json`)).catch(() => {});
  }
  console.log("meds_cache_miss", { key });
  return null;
}

async function writeCache(key: string, payload: CachePayload) {
  const expires_at = Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000;
  memCache.set(key, { payload, expires_at });
  if (!FILE_CACHE_ENABLED) return;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const p = path.join(CACHE_DIR, `${key}.json`);
    const record = { payload, fetched_at: Date.now(), expires_at };
    await fs.writeFile(p, JSON.stringify(record, null, 2), "utf8");
    await trimCache();
  } catch (e: any) {
    console.warn("meds_cache_write_fail", e?.message);
  }
}

async function gatherSources(slug: string, canonical: string, country: string) {
  const refs: string[] = [];
  let notes: string[] = [];
  // RxNorm
  try {
    const rx = await getRxCUI(canonical);
    if (rx?.idGroup?.rxnormId?.[0]) {
      const rxcui = rx.idGroup.rxnormId[0];
      refs.push(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}`);
    }
  } catch {}

  // DailyMed
  try {
    const dm = await getDailyMed(canonical);
    const setid = dm?.data?.[0]?.setid;
    if (setid) {
      const url = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`;
      refs.push(url);
      notes.push(dm?.data?.[0]?.title || "");
    }
  } catch {}

  // myUpchar link if India
  if (country.toUpperCase() === "IN") {
    const url = `https://www.myupchar.com/en/medicine/${slug}`;
    refs.push(url);
  }

  return { refs, notes: notes.filter(Boolean).join("\n") };
}

async function synthesize(canonical: string, notes: string, refs: string[]) {
  const base = {
    Actives: "",
    Uses: "",
    AdultDose: "",
    PediatricDose: "",
    SideEffects: "",
    Serious: "",
    Contraindications: "",
    Interactions: "",
    Pregnancy: "",
    Lactation: "",
    Brands: "",
  };
  const prompt = `You are a cautious medical assistant. Using the information below, summarize medication facts for ${canonical} in JSON with keys Actives, Uses, AdultDose, PediatricDose, SideEffects, Serious, Contraindications, Interactions, Pregnancy, Lactation, Brands. Be concise. Do not provide prescriptive dosing; only ranges or maxima if mentioned.\n\nINFO:\n${notes}`;
  const messages: ChatMsg[] = [
    { role: "system", content: "You carefully write medical drug information." },
    { role: "user", content: prompt },
  ];
  let out = "";
  try {
    out = await openaiText(messages);
  } catch {
    try {
      out = await groqChat(messages);
    } catch {}
  }
  try {
    const j = JSON.parse(out);
    return { ...base, ...j };
  } catch {
    return base;
  }
}

export async function getMedicationSummary({
  name,
  country,
  lang,
}: {
  name: string;
  country: string;
  lang: string;
}) {
  const { slug, canonical } = await normalize(name);
  const key = getCacheKey(slug, country);
  const cached = await readCache(key);
  if (cached) {
    return { ...cached, meta: { ...cached.meta, cached: true, ttl_days: TTL_DAYS } };
  }
  const { refs, notes } = await gatherSources(slug, canonical, country);
  if (refs.length < 2) {
    throw new Error("insufficient_sources");
  }
  const summary = await synthesize(canonical, notes, refs);
  const badge = "OTC"; // placeholder – real logic could vary by country
  const card = {
    card: {
      title: `${canonical} • ${badge}`,
      summary,
      badges: [badge],
      legal: "General information only — not medical advice.",
      references: refs,
    },
    meta: { slug, country, cached: false, ttl_days: TTL_DAYS },
  };
  await writeCache(key, card);
  return card;
}
