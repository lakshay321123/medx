import { describe, it, expect } from 'vitest';
import { shouldFetchAdForMessage } from '@/lib/ads/kindFilter';

describe('shouldFetchAdForMessage', () => {
  it('rejects therapy assistant messages', () => {
    const result = shouldFetchAdForMessage({
      role: 'assistant',
      kind: 'therapy',
      id: '1',
      pending: false,
    } as any);

    expect(result).toBe(false);
  });
});
