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
  const uniqueLines: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueLines.push(line);
  }
  text = uniqueLines.join(' ');

  // remove repeated tokens stuck together (e.g. InvestigationInvestigation)
  text = text.replace(/([A-Za-z]+)\1+/gi, '$1');
  text = text.replace(/(\d+(?:\.\d+)?)\1+/g, '$1');

  // normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // remove consecutive duplicate words/numbers
  const tokens = text.split(' ');
  text = tokens
    .filter((t, i) => i === 0 || t.toLowerCase() !== tokens[i - 1].toLowerCase())
    .join(' ');
  return text;
}
