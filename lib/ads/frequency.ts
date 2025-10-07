import type { UserTier } from '@/types/ads';

export const PROMPTS_PER_AD: Record<UserTier, number> = {
  free: 1,
  '100': 3,
  '200': 6,
  '500': 6,
};

export function shouldShowAd(promptCount: number, tier: UserTier): boolean {
  const frequency = PROMPTS_PER_AD[tier] ?? PROMPTS_PER_AD.free;
  if (!Number.isFinite(frequency) || frequency <= 0) return false;
  if (!Number.isFinite(promptCount) || promptCount <= 0) return false;
  return promptCount % frequency === 0;
}
