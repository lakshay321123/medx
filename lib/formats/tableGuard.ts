import type { FormatId } from './types';

export function needsTableCoercion(formatId?: FormatId) {
  return formatId === 'table_compare';
}
