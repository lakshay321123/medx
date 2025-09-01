export default async function pdfText(data: Buffer): Promise<string> {
  // @ts-ignore - pdf.js has no type definitions
  const pdfjs: any = await import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const allLines: string[] = [];

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

      allLines.push(...pageLines);
    } catch (err) {
      console.error('Failed to parse page', i, err);
    }
  }

  doc.destroy?.();

  const uniqueLines: string[] = [];
  const seen = new Set<string>();
  for (const line of allLines) {
    const key = line.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueLines.push(line);
  }

  const rawTokens = uniqueLines
    .join(' ')
    .split(/[^A-Za-z0-9.-]+/)
    .filter(Boolean);

  const cleanedTokens: string[] = [];
  for (let token of rawTokens) {
    token = token.replace(/([A-Za-z]+)\1+/gi, '$1');
    token = token.replace(/(\d+(?:\.\d+)?)(?:\1)+/g, '$1');
    const last = cleanedTokens[cleanedTokens.length - 1];
    if (last && last.toLowerCase() === token.toLowerCase()) continue;
    cleanedTokens.push(token);
  }

  return cleanedTokens.join(' ');
}
