import { runOCR } from './ocr';

export async function extractTextFromPDF(buf: Buffer) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    if (text.trim().length > 20) {
      return { text, ocr: false };
    }
    return { text: await runOCR(buf), ocr: true };
  } catch {
    return { text: await runOCR(buf), ocr: true };
  }
}

export default async function pdfText(buf: Buffer) {
  const { text } = await extractTextFromPDF(buf);
  return text;
}
