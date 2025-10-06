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

