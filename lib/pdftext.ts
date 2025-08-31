// lib/pdftext.ts
// Safe PDF text extraction with dynamic import (keeps Next.js bundler happy).

export async function extractTextFromPDF(
  buf: ArrayBuffer | Buffer | Uint8Array
): Promise<string> {
  // Some environments need the “.js” suffix, some don’t.
  // We try both paths to be robust, and we suppress TS with the stub we added.
  let pdfjsLib: any;
  try {
    // @ts-ignore - resolved by types/pdfjs-legacy.d.ts
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
  } catch {
    // @ts-ignore - resolved by types/pdfjs-legacy.d.ts
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
  }

  const uint8 =
    buf instanceof Uint8Array
      ? buf
      : Buffer.isBuffer(buf)
      ? new Uint8Array(buf)
      : new Uint8Array(buf);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    disableWorker: true, // critical for Node server routes
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
