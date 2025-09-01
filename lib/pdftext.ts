export default async function pdfText(data: Buffer): Promise<string> {
  // @ts-ignore - pdf.js has no type definitions
  const pdfjs: any = await import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const allLines: string[] = [];
  let prevHeader: string[] = [];
  let prevFooter: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      const lineMap = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items) {
        const str = (item.str || '').trim();
        if (!str) continue;
        const [x, y] = item.transform.slice(4, 6);
        const key = Math.round(y);
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key)!.push({ x, str });
      }

      const pageLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([_, items]) =>
          items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim()
        )
        .filter(Boolean);

      const header = pageLines.slice(0, 3).map(l => l.replace(/\s+/g, ' ').toLowerCase());
      const footer = pageLines.slice(-3).map(l => l.replace(/\s+/g, ' ').toLowerCase());

      for (const line of pageLines) {
        const norm = line.replace(/\s+/g, ' ').toLowerCase();
        if (prevHeader.includes(norm) || prevFooter.includes(norm)) continue;
        allLines.push(line);
      }

      prevHeader = header;
      prevFooter = footer;
    } catch (err) {
      console.error('Failed to parse page', i, err);
    }
  }

  doc.destroy?.();

  const cleanedLines = allLines.map(line => {
    const tokens = line.split(/[^A-Za-z0-9.-]+/).filter(Boolean);
    const cleaned: string[] = [];
    for (let token of tokens) {
      token = token.replace(/([A-Za-z]+)\1+/gi, '$1');
      token = token.replace(/(\d+(?:\.\d+)?)(?:\1)+/g, '$1');
      const last = cleaned[cleaned.length - 1];
      if (last && last.toLowerCase() === token.toLowerCase()) continue;
      cleaned.push(token);
    }
    return cleaned.join(' ');
  });

  return cleanedLines.join('\n');
}
