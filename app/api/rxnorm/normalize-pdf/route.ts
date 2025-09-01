import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';
import { analyzeLabText } from '@/lib/labReport';

export const runtime = 'nodejs';

async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(
    name
  )}&search=2`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    const j = await res.json();
    return j?.idGroup?.rxnormId?.[0] || null;
  } catch {
    return null;
  }
}

const STOPLIST = [
  'glucose',
  'thyroid',
  't3',
  't4',
  'tsh',
  'hdl',
  'ldl',
  'triglycerides',
  'bilirubin',
  'creatinine',
  'hemoglobin',
  'platelets',
  'wbc',
  'rbc',
  'hba1c',
];

function applyMedicationFilter(text: string): string[] {
  const stop = new Set(STOPLIST);
  const lines = text.split(/\r?\n/);
  const meds = new Set<string>();
  let inMedSection = false;
  for (const line of lines) {
    const l = line.trim();
    if (/^(prescription|medications?)/i.test(l)) {
      inMedSection = true;
      continue;
    }
    if (inMedSection && /^[A-Z ]{3,}$/.test(l) && !/(mg|mcg|tablets?|capsules?|inj|od|bd|tds|units?)/i.test(l)) {
      inMedSection = false;
    }
    const hasDose = /(\d+(?:\.\d+)?\s*(mg|mcg|g|ml|units?)\b)|(\b(tab(?:let)?s?|capsules?|inj|od|bd|tds)\b)/i.test(
      l
    );
    if (inMedSection || hasDose) {
      for (const tok of l.split(/[^A-Za-z0-9-]+/)) {
        const k = tok.toLowerCase();
        if (tok.length > 2 && !stop.has(k)) meds.add(tok);
      }
    }
  }
  return Array.from(meds);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.type !== 'application/pdf')
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text = '';
  let ocr = false;
  try {
    const res = await extractTextFromPDF(buf);
    text = res.text;
    ocr = res.ocr;
  } catch (e: any) {
    return NextResponse.json({ error: 'PDF parse failed', detail: String(e) }, { status: 500 });
  }

  if (!text.trim())
    return NextResponse.json({
      patient: null,
      reportType: 'Lab Report',
      sections: {},
      measurements: [],
      generalSummary: { overallHealth: '', keyFindings: [], suggestions: [] },
      doctorSummary: { redFlags: [] },
      medicationsDetected: [],
      meta: { usedOCR: ocr, parseNotes: ['No text extracted'] },
      disclaimer: 'Automated summary for educational use only.',
    });

  const analysis = analyzeLabText(text);

  const medTokens = applyMedicationFilter(text);
  const meds: { token: string; rxcui: string }[] = [];
  for (let i = 0; i < medTokens.length; i += 120) {
    const batch = medTokens.slice(i, i + 120);
    for (const token of batch) {
      try {
        const rxcui = await rxcuiForName(token);
        if (rxcui) meds.push({ token, rxcui });
      } catch {
        // ignore failed lookups
      }
    }
  }
  const dedup = Object.values(
    meds.reduce((acc: any, m) => ((acc[m.rxcui] = m), acc), {})
  );

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

  const measurements = analysis.measurements.map(m => ({
    test: m.canonical,
    value: m.value,
    unit: m.unit,
    refLow: m.refLow,
    refHigh: m.refHigh,
    flag: m.flag,
  }));

  const doctorSummary = {
    hepatic: analysis.doctorAnalysis.interpretations.hepatic,
    renal: analysis.doctorAnalysis.interpretations.renal,
    lipid: analysis.doctorAnalysis.interpretations.lipid,
    hematology: analysis.doctorAnalysis.interpretations.hematology,
    endocrine: [
      analysis.doctorAnalysis.interpretations.glucose,
      analysis.doctorAnalysis.interpretations.thyroid,
    ]
      .filter(Boolean)
      .join(' '),
    inflammation: analysis.doctorAnalysis.interpretations.inflammation,
    electrolytes: analysis.doctorAnalysis.interpretations.electrolytes,
    vitaminsHormones: analysis.doctorAnalysis.interpretations.vitaminsHormones,
    other: analysis.doctorAnalysis.interpretations.other,
    redFlags: analysis.doctorAnalysis.redFlags,
  };

  return NextResponse.json({
    patient: analysis.patient,
    reportType: 'Lab Report',
    sections,
    measurements,
    generalSummary: analysis.generalSummary,
    doctorSummary,
    medicationsDetected: dedup,
    meta: { usedOCR: ocr, parseNotes: [] },
    disclaimer: 'Automated summary for educational use only.',
  });
}
