import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Required for pdf-parse & tesseract

async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(buf);
    if (data.text && data.text.trim().length > 0) {
      return data.text;
    }
    // Fallback: OCR each page if no text
    return '[Scanned PDF: OCR needed]';
  } catch (e: any) {
    throw new Error(`PDF parse failed: ${e.message}`);
  }
}

async function extractOcrText(buf: Buffer): Promise<string> {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    const { data: { text } } = await Tesseract.recognize(buf, 'eng');
    return text || '';
  } catch (e: any) {
    throw new Error(`OCR failed: ${e.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (file.type === 'application/pdf') {
      extractedText = await extractPdfText(buf);
      if (extractedText.includes('[Scanned PDF')) {
        // OCR fallback if PDF text empty
        extractedText = await extractOcrText(buf);
      }
    } else if (file.type.startsWith('image/')) {
      extractedText = await extractOcrText(buf);
    } else {
      extractedText = '[Unsupported type for extraction]';
    }

    return NextResponse.json({
      ok: true,
      name: file.name,
      type: file.type,
      size: file.size,
      extractedText
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
