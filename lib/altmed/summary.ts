import fs from "fs/promises";
import { openaiText, groqChat, ChatMsg } from "@/lib/llm";

const WHITELIST_PATH = process.env.ALT_MED_WHITELIST_PATH || "./data/altmed_whitelist_domains.json";

async function readWhitelist(): Promise<string[]> {
  try {
    const raw = await fs.readFile(WHITELIST_PATH, "utf8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function fetchFromDomain(name: string, domain: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const tryUrls = [
    `https://${domain}/health/${slug}`,
    `https://${domain}/search?query=${encodeURIComponent(name)}`,
  ];
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "MedX/1.0 (+altmed)" } });
      if (res.ok) {
        const text = await res.text();
        return { text, ref: url };
      }
    } catch {
      // ignore and try next
    }
  }
  return null;
}

async function gatherSource(name: string) {
  const domains = await readWhitelist();
  for (const d of domains) {
    const hit = await fetchFromDomain(name, d);
    if (hit) return hit;
  }
  return null;
}

async function synthesize(name: string, text: string, ref: string) {
  const prompt = `Using the information below about ${name}, create JSON: {"name","claimed_use","evidence_note","cautions","interactions","references"}. Maintain neutral tone, note evidence quality (e.g., limited evidence), include safety cautions and possible interactions. Avoid implying proven efficacy.\nINFO:\n${text}`;
  const msgs: ChatMsg[] = [
    { role: "system", content: "You carefully summarize alternative medicine with a safety-first mindset." },
    { role: "user", content: prompt },
  ];
  let out = "";
  try {
    out = await openaiText(msgs);
  } catch {
    try {
      out = await groqChat(msgs);
    } catch {}
  }
  try {
    const j = JSON.parse(out);
    const references = Array.isArray(j.references) ? j.references : [];
    if (!references.length) references.push(ref);
    return { altMed: { ...j, references } };
  } catch {
    return {
      altMed: {
        name,
        claimed_use: "",
        evidence_note: "limited evidence",
        cautions: "insufficient safety data; consult clinician.",
        interactions: "potential interaction; monitor/consult.",
        references: [ref],
      },
    };
  }
}

export async function getAltMedSummary({ name }: { name: string }) {
  const src = await gatherSource(name);
  if (!src) throw new Error("no_whitelisted_source");
  return synthesize(name, src.text, src.ref);
}
