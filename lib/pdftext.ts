// lib/pdftext.ts
import { runOCR } from './ocr';

/**
 * Extracts text from a PDF buffer using pdfjs-dist.
 * Falls back to OCR if no meaningful text is found or pdf parsing fails.
 */
export async function extractTextFromPDF(
  buf: Buffer
): Promise<{ text: string; ocr: boolean }> {
  // Try parsing the embedded text layer via PDF.js
  try {
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.js');
    const getDocument = pdfjs.getDocument;

    const loadingTask = getDocument({ data: buf });
    const doc = await loadingTask.promise;

    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Join strings in reading order; add a newline between pages
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }

    // If we got a reasonable amount of text, return it
    if (text && text.trim().length > 20) {
      return { text, ocr: false };
    }

    // Otherwise, try OCR (likely a scanned PDF)
    try {
      const ocrText = await runOCR(buf);
      return { text: ocrText || '', ocr: true };
    } catch {
      // OCR not available or failed — return empty safely
      return { text: '', ocr: false };
    }
  } catch {
    // PDF.js parsing failed — try OCR as a fallback
    try {
      const ocrText = await runOCR(buf);
      return { text: ocrText || '', ocr: true };
    } catch {
      return { text: '', ocr: false };
    }
  }
}
