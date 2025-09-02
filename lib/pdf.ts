import { runOCR } from './ocr';
import { PDFDocument } from 'pdf-lib';

export interface Page {
  page: number;
  text: string;
  ocr: boolean;
  warnings?: string[];
}

export async function extractPdf(buf: Buffer): Promise<Page[]> {
  const pages: Page[] = [];
  const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as any);
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
    const srcDoc = await PDFDocument.load(buffer);
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const txt = (content.items as any[])
        .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+\n/g, '\n')
        .trim();
      if (txt && txt.length > 10) {
        pages.push({ page: i, text: txt, ocr: false });
      } else {
        let text = '';
        let warnings: string[] | undefined;
        try {
          const out = await PDFDocument.create();
          const [copied] = await out.copyPages(srcDoc, [i - 1]);
          out.addPage(copied);
          const single = await out.save();
          text = await runOCR(Buffer.from(single), 'application/pdf');
        } catch (e) {
          warnings = ['ocr_failed'];
        }
        if (!text.trim()) {
          warnings = ['ocr_failed'];
          text = '[OCR failed for this page]';
        }
        pages.push({ page: i, text, ocr: true, warnings });
      }
    }
  } catch (e) {
    const text = await runOCR(buffer, 'application/pdf');
    if (text.trim()) pages.push({ page: 1, text: text.trim(), ocr: true, warnings: ['pdf_parse_failed'] });
    else pages.push({ page: 1, text: '[OCR failed for this document]', ocr: true, warnings: ['ocr_failed', 'pdf_parse_failed'] });
  }
  return pages;
}

export { extractPdf as extractPages };
