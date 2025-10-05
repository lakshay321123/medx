export function hasMarkdownTable(text: string): boolean {
  return /\n\|[^|\n]+\|\n\|[ :\-|]+\|\n\|[^|\n]+\|/m.test(`\n${text}`);
}

export function extractFencedTable(text: string): string | null {
  const match = text.match(/```table\s+([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
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

export function coerceBulletsToRows(subject: string, text: string): string[] {
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
  const fenced = extractFencedTable(raw);
  if (fenced && hasMarkdownTable(`\n${fenced}`)) return fenced;

  if (hasMarkdownTable(raw)) {
    const tableMatch = raw.match(/\|[^|\n]+\|\n\|[ :\-|]+\|\n(?:\|.*\|\n?)+/m);
    if (tableMatch) return tableMatch[0].trim();
  }

  const rows = coerceBulletsToRows(subject, raw);
  return [HEADER, ...rows].join('\n');
}

export function wrapAsFencedTable(content: string): string {
  const inner = content.trim();
  return '```table\n' + inner + '\n```';
}
