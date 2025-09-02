import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";
import { analyzeLabText, DISCLAIMER } from "@/lib/labReport";

export const runtime = "nodejs";

// --- Medication guard helpers ---
const STOPLIST = new Set([
  "glucose",
  "sugar",
  "thyroid",
  "t3",
  "t4",
  "tsh",
  "hdl",
  "ldl",
  "triglycerides",
  "bilirubin",
  "creatinine",
  "hemoglobin",
  "platelets",
  "rbc",
  "wbc",
  "hba1c",
  "iron",
]);

const MED_CUE_RE = /\b(mg|ml|tab|cap|inj|od|bd|tds)\b/i;

async function rxcuiForName(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(
        name
      )}&search=2`
    );
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null;
  }
}

function looksLikeMedication(line: string): boolean {
  const l = line.toLowerCase();
  if (!MED_CUE_RE.test(l)) return false;
  for (const stop of STOPLIST) {
    if (l.includes(stop)) return false;
  }
  return true;
}

async function detectMedications(text: string) {
  const meds: { name: string; rxcui: string }[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!looksLikeMedication(line)) continue;
    const tokens = line
      .split(/[^A-Za-z0-9]+/)
      .filter((t) => t.length > 2);
    for (const token of tokens) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      const rxcui = await rxcuiForName(token);
      if (rxcui) {
        meds.push({ name: token, rxcui });
        seen.add(key);
      }
    }
  }
  return meds;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "No file provided (expecting 'file' in form-data)" },
      { status: 400 }
    );
  }

  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const isPdf =
    type.includes("pdf") ||
    type === "application/octet-stream" ||
    name.endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { ok: false, error: `Expected PDF, got ${type || "unknown"}` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    text = await extractTextFromPDF(buf); // parses all pages
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "PDF parse failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "PDF contained no extractable text" },
      { status: 422 }
    );
  }

  const analysis = analyzeLabText(text);
  const meds = await detectMedications(text);

  const sections = {
    thyroid: analysis.systems.thyroid,
    lipid: analysis.systems.lipid,
    cbc: analysis.systems.hematology,
    glucose: analysis.systems.glucose,
    renal: analysis.systems.renal,
    liver: analysis.systems.hepatic,
    inflammation: analysis.systems.inflammation,
    electrolytes: analysis.systems.electrolytes,
    vitaminsHormones: analysis.systems.vitaminsHormones,
    other: analysis.systems.other,
  };

  const measurements = analysis.measurements.map((m) => ({
    test: m.canonical,
    value: m.value,
    unit: m.unit,
    refLow: m.refLow,
    refHigh: m.refHigh,
    flag: m.flag,
  }));

  const body = {
    documentType: "Lab Report",
    patient: analysis.patient,
    sections,
    measurements,
    generalSummary: analysis.generalSummary,
    doctorSummary: {
      hepatic: analysis.doctorAnalysis.interpretations.hepatic,
      renal: analysis.doctorAnalysis.interpretations.renal,
      lipid: analysis.doctorAnalysis.interpretations.lipid,
      hematology: analysis.doctorAnalysis.interpretations.hematology,
      endocrine: analysis.doctorAnalysis.interpretations.thyroid,
      inflammation: analysis.doctorAnalysis.interpretations.inflammation,
      redFlags: analysis.doctorAnalysis.redFlags,
    },
    medicationsDetected: meds,
    disclaimer: DISCLAIMER,
  };

  return NextResponse.json(body);
}

