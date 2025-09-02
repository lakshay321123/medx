import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';
import { analyzeLabText, DISCLAIMER } from '@/lib/labReport';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return json({ ok: false, error: 'No file' }, 400);
    const hintsRaw = form.get('patientHints');
    let hints: any = undefined;
    if (typeof hintsRaw === 'string') {
      try { hints = JSON.parse(hintsRaw); } catch {}
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buf);
    if (!text.trim()) {
      return json({ ok: false, error: 'PDF contained no extractable text' }, 200);
    }
    const analysis = analyzeLabText(text, hints || undefined);
    return json({ ...analysis, meta: { usedOCR: false, parseNotes: [] }, disclaimer: DISCLAIMER }, 200);
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
