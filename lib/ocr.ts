import Tesseract from 'tesseract.js';

export async function runOCR(buffer: Buffer) {
  const {
    data: { text },
  } = await Tesseract.recognize(buffer, 'eng');
  return text.replace(/\s+/g, ' ').trim();
}
