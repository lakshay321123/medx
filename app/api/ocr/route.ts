import { NextRequest, NextResponse } from 'next/server';
import { ocrBuffer } from '@/lib/ocr';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await ocrBuffer(buffer);
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'OCR failed' }, { status: 500 });
  }
}
