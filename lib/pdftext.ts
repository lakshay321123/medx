import * as pdfjsLib from 'pdfjs-dist';

export async function extractTextFromPDF(buf: Buffer | Uint8Array) {
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((i: any) => i.str).join(' ') + '\n';
  }
  return text;
}
