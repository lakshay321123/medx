import { TABLE_HEADERS, TABLE_SEPARATOR } from '@/lib/i18n/tableHeaders';
import { bulletsOrPairsToRows, hasMarkdownTable } from './tableShape';
import type { FormatId } from './types';

export function needsTableCoercion(formatId?: FormatId) {
  return formatId === 'table_compare';
}

export function coerceToTable(subject: string, text: string, lang = 'en') {
  const header = TABLE_HEADERS[lang] ?? TABLE_HEADERS.en;
  const title = subject && subject.trim() ? subject : 'Comparison';
  const rows = bulletsOrPairsToRows(title, text, lang);
  return [header, TABLE_SEPARATOR, ...rows].join('\n');
}

export function ensureValidTable(md: string, subject: string, lang = 'en'): string {
  if (hasMarkdownTable(md)) return md;
  return coerceToTable(subject, md, lang);
}
