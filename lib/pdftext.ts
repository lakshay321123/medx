// lib/pdftext.ts
import { runOCR } from './ocr';

// Extracts text from a PDF buffer, falling back to OCR if needed
export async function extractTextFromPDF(
  buf: Buffer
): Promise<{ text: string; ocr: boolean }> {
  try {
    // ✅ pdfjs-dist correct import
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

    const loadingTask = pdfjsLib.getDocument({ data: buf });
    const doc = await loadingTask.promise;

    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }

    if (text.trim().length > 20) {
      return { text, ocr: false };
    }

    // Fallback if no meaningful text found
    const ocrText = await runOCR(buf);
    return { text: ocrText, ocr: true };
  } catch (err) {
    // Always ensure
