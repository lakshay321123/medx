// lib/pdftext.ts
export async function extractTextFromPDF(
  buf: ArrayBuffer | Buffer | Uint8Array
): Promise<string> {
  // @ts-ignore - pdfjs-dist types are partial
  const pdfjs: any = await import('pdfjs-dist');
  const { getDocument } = pdfjs;

  const uint8 =
    buf instanceof Uint8Array
      ? buf
      : Buffer.isBuffer(buf)
      ? new Uint8Array(buf)
      : new Uint8Array(buf);

  const task = getDocument({
    data: uint8,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    disableRange: true,
    disableStream: true,
  });

  const pdf = await task.promise;

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
