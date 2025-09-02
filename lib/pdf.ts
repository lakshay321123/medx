import { runOCR } from './ocr';

export interface PDFPage {
  page: number;
  text: string;
}

// Extract text per page from PDF buffer. If a page has little/no text, run OCR.
export async function extractPages(buf: Buffer): Promise<PDFPage[]> {
  const pages: PDFPage[] = [];
  const buffer = Buffer.isBuffer(buf)
    ? buf
    : Buffer.from(buf as any);

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      disableRange: true,
      disableStream: true,
    } as any);
    const pdf = await loadingTask.promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const txt = (content.items as any[])
        .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+\n/g, '\n')
        .trim();
      if (txt && txt.length > 10) {
        pages.push({ page: i, text: txt });
      } else {
        // OCR fallback for scanned pages
        const ocr = await runOCR(buffer);
        pages.push({ page: i, text: ocr });
      }
    }
  } catch {
    // If PDF parsing fails, attempt OCR on entire document
    const text = await runOCR(buffer);
    if (text) pages.push({ page: 1, text });
  }
  return pages;
}
