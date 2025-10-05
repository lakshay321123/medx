import type { FormatId } from './types';

export function hasMarkdownTable(text: string) {
  // Require header, a separator row, and at least one data row.
  return /\n\|[^|\n]+\|\n\|[ :\-|]+\|\n\|[^|\n]+\|/m.test(`\n${text}`);
}

function sanitizeCell(text: string) {
  return text.replace(/\|/g, '\\|').trim();
}

export function coerceToTable(subject: string, text: string) {
  const rows: string[] = [];
  const bullets = Array.from(text.matchAll(/^\s*[-*]\s+(.+)$/gm))
    .map(match => match[1])
    .filter(Boolean)
    .slice(0, 10);
  const sanitizedSubject = sanitizeCell(subject || 'Comparison');

  if (bullets.length > 0) {
    rows.push(
      ...bullets.map((bullet, index) => {
        const label = index === 0 ? sanitizedSubject : sanitizeCell(`Alt ${index}`);
        return `| ${label} |  |  |  | ${sanitizeCell(bullet)} |`;
      }),
    );
  } else {
    rows.push(`| ${sanitizedSubject || 'Topic'} |  |  |  |  |`);
  }

  return [
    '| Topic | Mechanism/How it works | Expected benefit | Limitations/Side effects | Notes/Evidence |',
    '|-------|-------------------------|------------------|--------------------------|----------------|',
    ...rows,
  ].join('\n');
}

export function needsTableCoercion(formatId?: FormatId) {
  return formatId === 'table_compare';
}
