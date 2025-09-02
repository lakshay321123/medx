import { Blob } from 'buffer';

const OCR_URL = process.env.OCR_INTERNAL_URL || 'http://localhost:3000/api/ocr';
const TIMEOUT = parseInt(process.env.DOC_TIMEOUT_MS || '30000', 10);

export async function runOCR(buf: Buffer, mime = 'application/pdf'): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      const fd = new FormData();
      fd.append('file', new Blob([buf], { type: mime }), `page.${mime === 'application/pdf' ? 'pdf' : 'png'}`);
      const res = await fetch(OCR_URL, { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`http-${res.status}`);
      const j = await res.json().catch(() => null);
      const text = j?.text || '';
      if (text.trim()) return text.trim();
    } catch (e) {
      if (attempt === 1) break;
    }
  }
  return '';
}

