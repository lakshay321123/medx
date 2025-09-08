export function detectDomain(text: string): string | null {
  const t = text.toLowerCase();
  if (/cardio|heart/.test(t)) return 'cardio';
  if (/onco|cancer|tumor|tumour/.test(t)) return 'oncology';
  return null;
}
