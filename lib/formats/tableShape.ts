export function hasMarkdownTable(text: string): boolean {
  // header + separator + ≥1 data row
  return /\n\|[^|\n]+\|\n\|[ :\-|]+\|\n\|[^|\n]+\|/m.test(`\n${text}`);
}

export function extractFirstTable(text: string): string | null {
  const match = text.match(/\|[^|\n]+\|\n\|[ :\-|]+\|\n(?:\|.*\|\n?)+/m);
  return match ? match[0].trim() : null;
}

export function sanitizeCell(value: string): string {
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const HEADER =
  '| Topic | Mechanism/How it works | Expected benefit | Limitations/Side effects | Notes/Evidence |\n' +
  '|-------|-------------------------|------------------|--------------------------|----------------|';

export function bulletsOrPairsToRows(subject: string, text: string): string[] {
  const rows: string[] = [];
  const bullets = Array.from(text.matchAll(/^\s*(?:[-*]|\d+\.)\s+(.+)$/gm))
    .map(match => match[1])
    .filter(Boolean)
    .slice(0, 12);

  if (bullets.length) {
    bullets.forEach((bullet, index) => {
      const label = index === 0 ? sanitizeCell(subject || 'Comparison') : sanitizeCell(`Alt ${index}`);
      rows.push(`| ${label} |  |  |  | ${sanitizeCell(bullet)} |`);
    });
    return rows;
  }

  const pairs = Array.from(text.matchAll(/^\s*([A-Za-z][\w %+\-/]*)\s*[:–—-]\s*(.+)$/gm))
    .map(match => [sanitizeCell(match[1]), sanitizeCell(match[2])]);

  if (pairs.length >= 2) {
    return pairs.slice(0, 8).map(([topic, note]) => `| ${topic} |  |  |  | ${note} |`);
  }

  const topic = sanitizeCell(subject || 'Comparison');
  return [`| ${topic} |  |  |  |  |`];
}

export function shapeToTable(subject: string, raw: string): string {
  const existing = extractFirstTable(raw);
  if (existing) return existing;

  const rows = bulletsOrPairsToRows(subject, raw);
  return [HEADER, ...rows].join('\n');
}

export function sanitizeMarkdownTable(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  let headerDone = false;

  const isSep = (L: string) => /^\s*\|(?:\s*-+\s*\|)+\s*$/.test(L);
  const isRow = (L: string) => /^\s*\|/.test(L);

  const fillDashes = (row: string) => {
    return row
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\|\s*(?=\|)/g, '| - ')
      .replace(/\|\s*$/, '|');
  };

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!isRow(L)) continue;

    if (!headerDone) {
      const hdr = fillDashes(L.trim());
      out.push(hdr);

      if (i + 1 < lines.length && isSep(lines[i + 1])) {
        out.push(lines[i + 1].replace(/\s+/g, ' ').trim());
        i++;
      } else {
        const cols = (hdr.match(/\|/g)?.length || 0) - 1;
        out.push('|' + Array(cols).fill('---').join('|') + '|');
      }
      headerDone = true;
      continue;
    }

    if (isSep(L)) continue;

    const bare = L.replace(/\|/g, '').trim();
    if (!bare) continue;

    out.push(fillDashes(L.trim()));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
