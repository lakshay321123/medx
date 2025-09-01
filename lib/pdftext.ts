import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

export type PdfExtractResult = {
  text: string;
  pagesWithText: number;
  totalPages: number;
};

export async function extractTextFromPDF(
  buf: ArrayBuffer | Buffer | Uint8Array,
  perPageTimeoutMs = 6000
): Promise<PdfExtractResult> {
  const data = buf instanceof ArrayBuffer ? new Uint8Array(buf) : (buf as any);
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  let pagesWithText = 0;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await withTimeout(pdf.getPage(i), perPageTimeoutMs, `page-${i}-timeout`);
    const content = await withTimeout(page.getTextContent(), perPageTimeoutMs, `content-${i}-timeout`);

    const strings = content.items
      .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
      .filter(Boolean);

    const pageText = strings.join(' ').replace(/\s+/g, ' ').trim();
    if (pageText.length > 0) pagesWithText++;

    pages.push(`\n\n--- Page ${i} ---\n${pageText}`);
  }

  return {
    text: pages.join('').replace(/\u0000/g, '').trim(),
    pagesWithText,
    totalPages: pdf.numPages,
  };
}

async function withTimeout<T>(p: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  return await Promise.race([
    p.then((v) => {
      if (t) clearTimeout(t);
      return v;
    }),
    new Promise<T>((_, rej) => {
      t = setTimeout(() => rej(new Error(label)), ms);
    }),
  ]);
}

