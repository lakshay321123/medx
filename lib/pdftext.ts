// lib/pdftext.ts
// Text extraction using PDF.js (server-side, no worker needed)

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

export async function extractTextFromPDF(
  buf: ArrayBuffer | Buffer | Uint8Array
): Promise<string> {
  // Normalize to Uint8Array
  const uint8 =
    buf instanceof Uint8Array
      ? buf
      : Buffer.isBuffer(buf)
      ? new Uint8Array(buf)
      : new Uint8Array(buf);

  // Disable worker in Node environment
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;

  let text = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const line = (content.items as any[])
      .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
      .join(' ');
    text += line + '\n';
  }

  return text.replace(/\s+\n/g, '\n').trim();
}
