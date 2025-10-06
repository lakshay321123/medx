import { describe, expect, it } from 'vitest';
import { isFormatAllowed } from '@/lib/formats/registry';
import type { Mode } from '@/lib/formats/types';

const TABLE_MODES: Mode[] = [
  'wellness',
  'therapy',
  'clinical',
  'wellness_research',
  'clinical_research',
  'aidoc',
];

describe('table_compare format availability', () => {
  it('is enabled across all supported modes', () => {
    TABLE_MODES.forEach(mode => {
      expect(isFormatAllowed('table_compare', mode)).toBe(true);
    });
  });
});
