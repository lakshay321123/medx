import { getDailyMed } from "@/lib/dailymed";
import { groqChat, openaiText, ChatMsg } from "@/lib/llm";

const ALIASES: Record<string, string> = {
  tylenol: "acetaminophen",
  crocin: "paracetamol",
};

const HARDCODED = new Set(["metformin", "lisinopril", "levothyroxine"]);

async function normalize(name: string): Promise<{ slug: string; canonical: string }> {
  const lowered = name.toLowerCase();
  const aliased = ALIASES[lowered] || name;
  if (HARDCODED.has(lowered)) {
    const canonicalStr = aliased;
    const slug = canonicalStr.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return { slug, canonical: canonicalStr };
  }
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(aliased)}&maxEntries=1`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.ok) {
      const j = await r.json();
      const cand = j?.approximateGroup?.candidate?.[0]?.candidate;
      if (cand) {
        const canonicalStr = String(cand);
        const slug = canonicalStr.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return { slug, canonical: canonicalStr };
      }
    }
  } catch {
    // ignore network errors
  }
  throw new Error("normalize_failed");
}

async function purposeAndCautions(canonical: string) {
  const prompt = `In one sentence, what does ${canonical} do? List two key cautions. Return JSON {"purpose":"","cautions":["",""]}.`;
  const messages: ChatMsg[] = [
    { role: "system", content: "You carefully explain medications." },
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
    return {
      purpose: String(j.purpose || ""),
      cautions: Array.isArray(j.cautions) ? j.cautions.slice(0, 2).map(String) : [],
    };
  } catch {
    return { purpose: "", cautions: [] };
  }
}

export async function getChronicMedEducation(names: string[]) {
  const unique = Array.from(new Set(names.map((n) => String(n).trim().toLowerCase()).filter(Boolean)));
  const chronicMeds: { name: string; purpose: string; cautions: string[]; references: string[] }[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const raw of unique) {
    try {
      const { slug, canonical } = await normalize(raw);
      if (seen.has(canonical.toLowerCase())) continue;
      seen.add(canonical.toLowerCase());
      const refs: string[] = [];
      try {
        const dm = await getDailyMed(canonical);
        const setid = dm?.data?.[0]?.setid;
        if (setid) refs.push(`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`);
      } catch {}
      refs.push(`https://www.nhs.uk/medicines/${slug}`);
      const { purpose, cautions } = await purposeAndCautions(canonical);
      chronicMeds.push({ name: canonical, purpose, cautions, references: refs });
    } catch {
      skipped.push(raw);
    }
  }
  return { chronicMeds, skipped };
}
