import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld';

  const fd = new FormData();
  fd.append('language', 'eng');
  fd.append('isTable', 'false');
  fd.append('isOverlayRequired', 'false');
  fd.append('OCREngine', '2'); // better for handwriting
  fd.append('scale', 'true');
  fd.append('detectOrientation', 'true');
  fd.append('file', new Blob([buf], { type: file.type || 'image/jpeg' }), file.name || 'image.jpg');

  const resp = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: apiKey },
    body: fd
  });

  if (!resp.ok) {
    const t = await resp.text();
    return NextResponse.json({ error: `OCR error ${resp.status}`, detail: t }, { status: 500 });
  }

  const j = await resp.json();
  const parsed = j?.ParsedResults?.[0];
  const text = parsed?.ParsedText || '';
  const error = j?.IsErroredOnProcessing ? (j?.ErrorMessage || 'OCR failed') : null;

  return NextResponse.json({ text, error, ocrExitCode: parsed?.OCRExitCode });
}
