export function detectResearchIntent(text: string): boolean {
  if (!process.env.MEDX_MODES_V2) return false;
  const re = /(evidence|study|studies|RCT|randomized|meta[- ]analysis|guideline|NICE|Cochrane|ICMR|WHO)/i;
  return re.test(text);
}
