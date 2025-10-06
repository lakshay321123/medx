import { describe, expect, it } from 'vitest';
import { buildFormatInstruction } from '@/lib/formats/build';
import { isValidLang } from '@/lib/formats/constants';

const SUPPORTED_FOR_FORMATS = ['en', 'hi', 'es', 'it', 'fr', 'ar', 'de', 'zh'] as const;

describe('format instruction language support', () => {
  it('treats all supported UI languages as valid for formats', () => {
    SUPPORTED_FOR_FORMATS.forEach(lang => {
      expect(isValidLang(lang)).toBe(true);
    });
  });

  it('falls back to English metadata when localized labels are missing', () => {
    const instruction = buildFormatInstruction('fr', 'therapy', 'table_compare');
    expect(instruction).toContain('# Output format:');
    expect(instruction).toContain('Comparison table');
  });
});
