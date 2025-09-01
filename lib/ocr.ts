import Tesseract from 'tesseract.js';

/**
 * Run OCR on a buffer and return the raw text.
 * Used internally by {@link ocrBuffer} but exported for backwards compat.
 */
export async function runOCR(buffer: Buffer) {
  const {
    data: { text },
  } = await Tesseract.recognize(buffer, 'eng');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Convenience wrapper returning text along with a flag indicating OCR usage.
 */
export async function ocrBuffer(buffer: Buffer) {
  const text = await runOCR(buffer);
  return { text, usedOCR: true };
}
