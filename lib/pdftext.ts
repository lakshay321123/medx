import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), disableWorker: true }).promise;
    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n';
    }
    return text.trim();
  } catch {
    throw new Error('Invalid or unreadable PDF');
  }
}
