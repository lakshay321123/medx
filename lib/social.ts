export type SocialIntent = 'yes' | 'no' | null;

/** Strict detector: only exact single-intent messages trigger. */
export function detectSocialIntent(input: string): SocialIntent {
  const s = (input || '').trim().toLowerCase().replace(/[.!?]+$/, '');
  if (!s) return null;

  // YES set (exact)
  const YES = new Set(['y', 'yes', 'ok', 'okay', 'sure', 'proceed', 'go ahead', 'continue', '👍', '👌']);
  // NO set (exact)
  const NO = new Set(['n', 'no', 'stop', 'hold', 'cancel', "don't", 'do not', '👎']);

  if (YES.has(s)) return 'yes';
  if (NO.has(s)) return 'no';
  return null;
}

