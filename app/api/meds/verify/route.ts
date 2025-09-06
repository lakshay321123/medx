export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

async function approxMed(term: string) {
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=1`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const cand = j?.approximateGroup?.candidate?.[0];
    return cand?.candidate ? String(cand.candidate) : null; // e.g., "Metformin"
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({}));
  const t = String(text || "").trim();
  // very light pattern: word-ish + optional dose number + unit
  const m = t.match(/\b([A-Za-z][A-Za-z0-9-]{2,})\b(?:\s+(\d{2,4}))?\s*(mg|mcg|µg|g)?\b/i);
  if (!m) return NextResponse.json({ ok: false });
  const raw = m[1];
  const dose = m[2] || "";
  const unit = (m[3] || (dose ? "mg" : "")).toLowerCase();

  const canonical = await approxMed(raw);
  if (!canonical || canonical.toLowerCase() === raw.toLowerCase()) {
    return NextResponse.json({ ok: false });
  }
  const suggestion = [canonical, dose && ` ${dose}`, unit && ` ${unit}`].filter(Boolean).join("");
  return NextResponse.json({ ok: true, suggestion, canonical, dose, unit });
}
