import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

// Extracts clean, ordered text from ALL pages of a PDF buffer
export async function extractTextFromPDF(buf: ArrayBuffer | Buffer | Uint8Array): Promise<string> {
  const data = buf instanceof ArrayBuffer ? new Uint8Array(buf) : (buf as any);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join text items in reading order; add line breaks at reasonable gaps
    const strings = content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
      .filter(Boolean);
    const pageText = strings.join(' ').replace(/\s+/g, ' ').trim();
    pages.push(pageText);
  }

  // Join with clear page separators to help downstream parsers
  const full = pages
    .map((t, idx) => `\n\n--- Page ${idx + 1} ---\n${t}`)
    .join('');

  // Normalize control chars
  return full.replace(/\u0000/g, '').trim();
}

