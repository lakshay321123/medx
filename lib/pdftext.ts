// lib/pdftext.ts
// Extracts text from a PDF buffer using pdfjs-dist. Falls back to OCR if the
// text layer is empty.

export async function extractTextFromPDF(
  buf: ArrayBuffer | Buffer | Uint8Array
): Promise<{ text: string; ocr: boolean }> {
  // Normalize input to Buffer for OCR and Uint8Array for pdfjs
  const buffer: Buffer = Buffer.isBuffer(buf)
    ? buf
    : buf instanceof ArrayBuffer
    ? Buffer.from(buf)
    : Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);

  try {
    // Dynamically import legacy build which works in Node environments
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

    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const line = (content.items as any[])
        .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
        .join(' ');
      text += line + '\n';
    }
    text = text.replace(/\s+\n/g, '\n').trim();
    if (text.length > 20) {
      return { text, ocr: false };
    }
  } catch {
    // ignore PDF parse errors and fall back to OCR
  }

  const { runOCR } = await import('./ocr');
  const ocrText = await runOCR(buffer);
  return { text: ocrText, ocr: true };
}
