import Tesseract from 'tesseract.js';

export async function ocrBuffer(
  buf: Buffer | Uint8Array,
  timeoutMs = 20000
): Promise<{ text: string; usedOCR: boolean }> {
  const doOCR = async () => {
    const { data: { text } } = await Tesseract.recognize(buf as any, 'eng');
    return (text || '').replace(/\s+/g, ' ').trim();
  };

  const text = await withTimeout(doOCR(), timeoutMs, 'ocr-timeout').catch(() => '');
  return { text, usedOCR: text.length > 0 };
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
