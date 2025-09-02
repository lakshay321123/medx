import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { extractPdf } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET() {
  const t0 = Date.now();
  try {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 300]);
    page.drawText('Hello world');
    const bytes = await doc.save();
    const pages = await extractPdf(Buffer.from(bytes));
    const stats = {
      totalPages: pages.length,
      nativeTextPages: pages.filter((p) => !p.ocr && !(p.warnings || []).length).length,
      ocredPages: pages.filter((p) => p.ocr && !(p.warnings || []).length).length,
      failedPages: pages.filter((p) => (p.warnings || []).length).length,
      elapsedMs: Date.now() - t0,
    };
    return NextResponse.json(stats);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
