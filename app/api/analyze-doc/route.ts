import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const { text, ocr } = await extractTextFromPDF(buf);
    return NextResponse.json({ text, note: ocr ? 'OCR fallback used' : 'PDF text extracted' });
  } catch (e: any) {
    return NextResponse.json({ error: 'PDF parse failed', detail: String(e) }, { status: 500 });
  }
}
