export async function runOCR(buf: Buffer): Promise<string> {
  try {
    const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'application/pdf' }), 'upload.pdf');
    fd.append('language', 'eng');
    fd.append('OCREngine', '2');
    fd.append('scale', 'true');
    fd.append('isTable', 'false');
    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: fd,
    });
    if (!resp.ok) return '';
    const j = await resp.json().catch(() => null);
    return j?.ParsedResults?.[0]?.ParsedText || '';
  } catch {
    return '';
  }
}
