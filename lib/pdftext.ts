import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
// @ts-ignore - pdfjs worker packaged with pdfjs-dist
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const data = new Uint8Array(arrayBuffer);
    const pdf = await pdfjs.getDocument({ data }).promise;
    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n';
    }
    const finalText = text.trim();
    if (!finalText) {
      throw new Error('No text content found in PDF');
    }
    return finalText;
  } catch (err: any) {
    if (err instanceof Error && err.message === 'No text content found in PDF') {
      throw err;
    }
    throw new Error('Invalid or unreadable PDF');
  }
}
