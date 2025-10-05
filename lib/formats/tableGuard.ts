import type { FormatId } from './types';

export function hasMarkdownTable(text: string) {
  return /\n\|.*\|\n\|[-:| ]+\|\n/.test(`\n${text}`);
}

function sanitizeCell(text: string) {
  return text.replace(/\|/g, '\\|').trim();
}

export function coerceToTable(subject: string, text: string) {
  const rows: string[] = [];
  const bullets = Array.from(text.matchAll(/^\s*[-*]\s+(.+)$/gm)).map(match => match[1]).slice(0, 6);
  const sanitizedSubject = sanitizeCell(subject || 'Comparison');

  if (bullets.length >= 2) {
    rows.push(`| ${sanitizedSubject} |  |  |  |  |`);
    rows.push(`| Alt |  |  |  |  |`);
  }

  if (rows.length === 0) {
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
