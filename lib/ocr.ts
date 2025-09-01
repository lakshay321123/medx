export async function ocrBuffer(buf: Buffer | ArrayBuffer | Uint8Array) {
  const apiKey = process.env.OCRSPACE_API_KEY;
  if (!apiKey) throw new Error('OCRSPACE_API_KEY not set');

  const buffer =
    buf instanceof Uint8Array
      ? Buffer.from(buf)
      : Buffer.isBuffer(buf)
      ? buf
      : Buffer.from(buf);

  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type: 'application/pdf' }), 'file.pdf');
  fd.append('language', 'eng');
  fd.append('OCREngine', '2');
  fd.append('scale', 'true');
  fd.append('isTable', 'false');

  const resp = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: apiKey },
    body: fd,
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OCR error ${resp.status}: ${t}`);
  }
  const j = await resp.json();
  const text = j?.ParsedResults?.[0]?.ParsedText || '';
  return { text };
}
