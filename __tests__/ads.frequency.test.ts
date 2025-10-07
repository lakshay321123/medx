import { describe, it, expect } from 'vitest';
import { shouldShowAd, PROMPTS_PER_AD } from '@/lib/ads/frequency';

describe('frequency', () => {
  it('free: every 1', () => {
    expect(PROMPTS_PER_AD.free).toBe(1);
    expect(shouldShowAd(0, 'free')).toBe(false);
    expect(shouldShowAd(1, 'free')).toBe(true);
  });
  it('100: every 3', () => {
    expect(PROMPTS_PER_AD['100']).toBe(3);
    expect(shouldShowAd(2, '100')).toBe(false);
    expect(shouldShowAd(3, '100')).toBe(true);
  });
  it('200/500: every 6', () => {
    expect(PROMPTS_PER_AD['200']).toBe(6);
    expect(PROMPTS_PER_AD['500']).toBe(6);
    expect(shouldShowAd(5, '200')).toBe(false);
    expect(shouldShowAd(6, '200')).toBe(true);
  });
});
