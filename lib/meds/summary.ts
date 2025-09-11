// feat: add medication summary file cache with TTL and LRU

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

// lightweight message type (no SDK import)
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// ---- Config / Env ----
const FILE_CACHE_ENABLED = (process.env.MEDS_FILE_CACHE || "true").toLowerCase() === "true";
const CACHE_DIR = process.env.MEDS_CACHE_DIR || "/tmp/meds-cache"; // Vercel-writable
const TTL_DAYS = Number(process.env.MEDS_CACHE_TTL_DAYS || 90);
const MAX_BYTES = Number(process.env.MEDS_CACHE_MAX_MB || 200) * 1024 * 1024;
const SOURCE_VERSION = process.env.MEDS_SOURCE_VERSION || "1";

const SOURCE_WHITELIST = (process.env.MEDS_SOURCE_WHITELIST || "").toLowerCase() === "true";
const APPLY_POLICY = (process.env.APPLY_MEDICAL_POLICY || "").toLowerCase() === "true";
const WHITELIST_PATH =
  process.env.MEDS_WHITELIST_PATH || path.join(process.cwd(), "data/whitelist_domains.json");
const COUNTRY_RULES_PATH =
  process.env.COUNTRY_RULES_PATH || path.join(process.cwd(), "data/country_rules.json");

// ---- Types / caches ----
type CachePayload = { card: any; meta: any };
type CacheEntry = { payload: CachePayload; expires_at: number };
const memCache = new Map<string, CacheEntry>();

let whitelistCache: string[] | null = null;
let countryRulesCache: Record<string, any> | null = null;

// ---- Helpers: whitelist & rules ----
async function loadWhitelist() {
  if (whitelistCache) return whitelistCache;
  try {
    const raw = await fs.readFile(WHITELIST_PATH, "utf8");
    whitelistCache = JSON.parse(raw);
  } catch {
    whitelistCache = [];
  }
  return whitelistCache;
}

async function loadCountryRules() {
  if (countryRulesCache) return countryRulesCache;
  try {
    const raw = await fs.readFile(COUNTRY_RULES_PATH, "utf8");
    countryRulesCache = JSON.parse(raw);
  } catch {
    countryRulesCache = {};
  }
  return countryRulesCache;
}

// ---- Name normalization ----
const ALIASES: Record<string, string> = {
  tylenol: "acetaminophen",
  crocin: "paracetamol",
};

async function normalize(name: string): Promise<{ slug: string; canonical: string }> {
  const lowered = name.toLowerCase();
  const aliased = ALIASES[lowered] || name;
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(
      aliased
    )}&maxEntries=1`;
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
    // ignore network error
  }
  // fallback: use aliased name if it looks word-ish
  if (/^[a-z][a-z0-9-\s]{2,}$/i.test(aliased)) {
    const slug = aliased.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return { slug, canonical: aliased };
  }
  throw new Error("normalize_failed");
}

// ---- Cache key / LRU trim ----
function getCacheKey(slug: string, country: string) {
  const input = `${slug}|${country}|${SOURCE_VERSION}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function ensureCacheDir() {
  if (!FILE_CACHE_ENABLED) return;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {}
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
    stats.sort((a, b) => a.mtime - b.mtime); // oldest first
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
  await ensureCacheDir();
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    const raw = await fs.readFile(p, "utf8");
    const data = JSON.parse(raw) as CacheEntry & { fetched_at?: number };
    if (now < data.expires_at) {
      memCache.set(key, { payload: data.payload, expires_at: data.expires_at });
      // touch mtime for LRU
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
    await ensureCacheDir();
    const p = path.join(CACHE_DIR, `${key}.json`);
    const record = { payload, fetched_at: Date.now(), expires_at };
    await fs.writeFile(p, JSON.stringify(record, null, 2), "utf8");
    await trimCache();
  } catch (e: any) {
    console.warn("meds_cache_write_fail", e?.message);
  }
}

// ---- External data via fetch (no SDKs) ----
async function fetchRxCUI(drug: string) {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.ok) return r.json();
  } catch {}
  return null;
}

async function fetchDailyMedSetId(drug: string) {
  try {
    const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(
      drug
    )}&pagesize=5`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.ok) return r.json();
  } catch {}
  return null;
}

async function gatherSources(slug: string, canonical: string, country: string) {
  const refs: string[] = [];
  let notes: string[] = [];

  // RxNorm reference
  try {
    const rx = await fetchRxCUI(canonical);
    if (rx?.idGroup?.rxnormId?.[0]) {
      const rxcui = rx.idGroup.rxnormId[0];
      refs.push(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}`);
    }
  } catch {}

  // DailyMed reference
  try {
    const dm = await fetchDailyMedSetId(canonical);
    const setid = dm?.data?.[0]?.setid;
    if (setid) {
      refs.push(`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`);
      notes.push(dm?.data?.[0]?.title || "");
    }
  } catch {}

  // myUpchar if India
  if (country.toUpperCase() === "IN") {
    refs.push(`https://www.myupchar.com/en/medicine/${slug}`);
  }

  return { refs, notes: notes.filter(Boolean).join("\n") };
}

async function filterRefs(refs: string[]) {
  if (!SOURCE_WHITELIST) return refs;
  const whitelist = await loadWhitelist();
  const allowed = new Set(whitelist.map((w) => w.toLowerCase()));
  const out: string[] = [];
  for (const r of refs) {
    try {
      const host = new URL(r).hostname.toLowerCase();
      if (allowed.has(host)) out.push(r);
      else console.warn("meds_nonwhitelist_ref", { url: r });
    } catch {
      console.warn("meds_nonwhitelist_ref", { url: r });
    }
  }
  return out;
}

async function determineBadge(slug: string, country: string) {
  if (!APPLY_POLICY) return { badge: "Rx" as "Rx" | "OTC" };
  const rules = await loadCountryRules();
  const region = rules[country.toUpperCase()] || {};
  const entry = region[slug];
  const source = COUNTRY_RULES_PATH;
  if (!entry) {
    console.log("meds_country_rule", { slug, country, source, applied: false });
    return { badge: "Rx" as const, note: "availability may vary." };
  }
  const statuses = Array.isArray(entry) ? entry : [entry];
  console.log("meds_country_rule", { slug, country, source, rule: statuses });
  const uniq = Array.from(new Set(statuses.map((s: string) => s.toUpperCase())));
  if (uniq.length > 1) {
    return { badge: "Rx" as const, note: "conflicting classifications" };
    }
  return { badge: uniq[0] === "OTC" ? ("OTC" as const) : ("Rx" as const) };
}

// ---- LLM summarize via fetch (no SDK imports) ----
async function llmSummarize(messages: ChatMsg[]) {
  const providers = [
    {
      url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
    },
    {
      url: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
      key: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL_ID || "llama-3.1-70b-versatile",
    },
  ];
  for (const p of providers) {
    if (!p.key) continue;
    try {
      const r = await fetch(`${p.url}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.2 }),
      });
      const j = await r.json();
      if (r.ok) return j.choices?.[0]?.message?.content || "";
    } catch {}
  }
  return "";
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
  const out = await llmSummarize(messages);
  try {
    const j = JSON.parse(out);
    return { ...base, ...j };
  } catch {
    return base;
  }
}

// ---- Public orchestrator ----
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
  const filteredRefs = await filterRefs(refs);
  if (filteredRefs.length === 0) {
    throw new Error("no_valid_refs");
  }

  const summary = await synthesize(canonical, notes, filteredRefs);

  // strip imperative verbs to keep “info-only”
  const imp = /\b(take|give|use|apply|administer|consume)\b/gi;
  summary.AdultDose = (summary.AdultDose || "").replace(imp, "").trim();
  summary.PediatricDose = (summary.PediatricDose || "").replace(imp, "").trim();

  const { badge, note } = await determineBadge(slug, country);

  const card = {
    card: {
      title: `${canonical} • ${badge}`,
      summary,
      badges: [badge],
      legal: "General information only — not medical advice.",
      references: filteredRefs,
    },
    meta: {
      slug,
      country,
      cached: false,
      ttl_days: TTL_DAYS,
      ...(note ? { policy_note: note } : {}),
    },
  };

  await writeCache(key, card);
  return card;
}
