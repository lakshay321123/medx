export default async function pdfText(data: Buffer): Promise<string> {
  // @ts-ignore - pdf.js has no type definitions
  const pdfjs: any = await import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str || '').join(' ');
      pages.push(pageText);
    } catch (err) {
      console.error('Failed to parse page', i, err);
    }
  }
  doc.destroy?.();
  let text = pages.join('\n');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  text = unique.join(' ');
  text = text.replace(/(\b[a-zA-Z]+)(\1)+/g, '$1');
  text = text.replace(/(\b\d+(?:\.\d+)?)(\1)+/g, '$1');
  text = text.replace(/\s+/g, ' ').trim();
  const tokens = text.split(' ');
  text = tokens.filter((t, i) => i === 0 || t !== tokens[i - 1]).join(' ');
  return text;
}
