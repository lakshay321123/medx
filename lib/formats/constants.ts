import type { Lang, Mode } from './types';

export const VALID_LANGS = ['en', 'hi', 'es', 'it'] as const;
export const VALID_MODES = [
  'clinical',
  'aidoc',
  'therapy',
  'clinical_research',
  'wellness_research',
  'wellness',
] as const;

export const isValidLang = (value: string): value is Lang =>
  (VALID_LANGS as readonly string[]).includes(value as Lang);

export const isValidMode = (value: string): value is Mode =>
  (VALID_MODES as readonly string[]).includes(value as Mode);
