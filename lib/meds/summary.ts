import path from "path";
import fs from "fs/promises";
import { groqChat, openaiText } from "@/lib/llm";
import { getDailyMed } from "@/lib/dailymed";
import { getRxCUI } from "@/lib/rxnorm";

const CACHE_DIR = path.join(process.cwd(), "data/meds-cache");
const TTL_DAYS = Number(process.env.MEDS_CACHE_TTL_DAYS || 90);

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

async function readCache(slug: string) {
  try {
    const p = path.join(CACHE_DIR, `${slug}.json`);
    const raw = await fs.readFile(p, "utf8");
    const data = JSON.parse(raw);
    if (Date.now() < Number(data.expires_at)) {
      return { cached: true, payload: data.payload };
    }
  } catch {}
  return null;
}

async function writeCache(slug: string, payload: any) {
  try {
    const p = path.join(CACHE_DIR, `${slug}.json`);
    const expires_at = Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000;
    await fs.writeFile(p, JSON.stringify({ expires_at, payload }, null, 2), "utf8");
  } catch {}
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
  const messages = [
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

export async function getMedicationSummary({ name, country, lang }:{ name: string; country: string; lang: string }) {
  const { slug, canonical } = await normalize(name);
  const cached = await readCache(slug);
  if (cached) {
    return { ...cached.payload, meta: { ...cached.payload.meta, cached: true } };
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
  await writeCache(slug, card);
  return card;
}
