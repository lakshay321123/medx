import { describe, it, expect } from 'vitest';
import { shouldFetchAdForMessage } from '@/lib/ads/kindFilter';

describe('kind filter', () => {
  it('allows assistant chat', () => {
    expect(
      shouldFetchAdForMessage({ role: 'assistant', kind: 'chat', id: '1', pending: false } as any),
    ).toBe(true);
  });
  it('blocks undefined kind', () => {
    expect(shouldFetchAdForMessage({ role: 'assistant', id: '1', pending: false } as any)).toBe(false);
  });
  it('blocks reports/aidoc', () => {
    expect(
      shouldFetchAdForMessage({ role: 'assistant', kind: 'report', id: '1', pending: false } as any),
    ).toBe(false);
  });
});
