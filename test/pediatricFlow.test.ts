import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

describe('pediatric flow', () => {
  beforeEach(() => {
    process.env.PEDIATRIC_FLOW_ENABLED = 'true';
    process.env.PEDIATRIC_MINIMAL_QUESTIONS = 'true';
  });

  it('asks for age when missing', async () => {
    const { disambiguate } = await import('@/lib/conversation/disambiguation');
    const ctx = 'what medicine for my baby with fever?';
    const q = disambiguate(ctx, ctx);
    assert.ok(q && q.toLowerCase().includes('how old'));
  });

  it('returns shortlist when clarified', async () => {
    const { disambiguate } = await import('@/lib/conversation/disambiguation');
    const ctx = 'my toddler is 2 years old with cough. what medicine can i give?';
    const r = disambiguate('what medicine can i give?', ctx);
    assert.ok(r && r.includes('General information only'));
  });
});
