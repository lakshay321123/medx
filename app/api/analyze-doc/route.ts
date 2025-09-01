import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";
import { detectDocumentType } from "@/lib/detectDocumentType";
import { parseLabValues } from "@/lib/parseLabs";

export const runtime = "nodejs";
export const maxDuration = 60;

// Simple prescription parser placeholder using RxNorm lookup
async function parsePrescription(text: string) {
  return { meds: await rxFromText(text) };
}

// Use existing lab parser
async function parseLabReport(text: string) {
  return { labs: parseLabValues(text) };
}

async function parseImaging(text: string) {
  return { rawText: text };
}

async function parseClinicalNotes(text: string) {
  return { rawText: text };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { text } = await extractTextFromPDF(buf);

  if (!text.trim()) {
    return NextResponse.json({ error: "Empty text extracted" }, { status: 400 });
  }

  // 🔍 Detect type
  const docType = detectDocumentType(text, file.type, file.name);

  // 🔀 Route to pipelines
  switch (docType) {
    case "prescription":
      return NextResponse.json({ documentType: docType, content: await parsePrescription(text) });
    case "lab":
      return NextResponse.json({ documentType: docType, content: await parseLabReport(text) });
    case "imaging":
      return NextResponse.json({ documentType: docType, content: await parseImaging(text) });
    case "clinical":
      return NextResponse.json({ documentType: docType, content: await parseClinicalNotes(text) });
    default:
      return NextResponse.json({ documentType: "other", rawText: text });
  }
}

function cleanToken(t: string): string {
  return t
    .replace(/[^\w\s\-\+\/\.]/g, " ")
    .replace(/\b(tab(?:let)?|cap(?:sule)?|syrup|susp(?:ension)?|drop(?:s)?|inj(?:ection)?|cream|gel|ointment|soln|solution)\b/gi, " ")
    .replace(/\b(\d+(?:\.\d+)?)(mg|mcg|g|ml|iu)\b/gi, " ")
    .replace(/\b(qd|od|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function rxcuiForName(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

async function rxFromText(text: string) {
  const words: string[] = text.split(/[^A-Za-z0-9-]+/).filter((w: string) => w.length > 2);
  const cleaned: string[] = words.map(cleanToken).filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i < cleaned.length; i++) {
    grams.add(cleaned[i]);
    if (i + 1 < cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i + 1]}`);
    if (i + 2 < cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i + 1]} ${cleaned[i + 2]}`);
  }
  const tokens = Array.from(grams).slice(0, 200);
  const found: Array<{ token: string; rxcui: string }> = [];
  for (const token of tokens) {
    const r = await rxcuiForName(token);
    if (r) found.push({ token, rxcui: r });
  }
  const meds = Object.values(
    found.reduce<Record<string, { token: string; rxcui: string }>>((acc, m) => {
      if (!acc[m.rxcui]) acc[m.rxcui] = m;
      return acc;
    }, {})
  );
  return meds;
}
