import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

describe('senior safety tips', () => {
  beforeEach(() => {
    process.env.SENIOR_SAFETY_TIPS = 'true';
    process.env.SENIOR_AGE_THRESHOLD = '65';
  });

  it('injects tips for seniors', async () => {
    const { injectSeniorTips } = await import('@/lib/rules/seniorSafety');
    const cards = [{ lines: ['Base line'] }];
    const out = injectSeniorTips(cards, { age: 70, meds: [] });
    const lines = out[0].lines.join('\n');
    assert.ok(lines.includes('fall risk'));
    assert.ok(lines.includes('kidney function'));
  });

  it('adds interaction tip when polypharmacy', async () => {
    const { injectSeniorTips } = await import('@/lib/rules/seniorSafety');
    const cards = [{ lines: [] }];
    const out = injectSeniorTips(cards, { age: 80, meds: [1,2,3,4,5] });
    const lines = out[0].lines.join('\n').toLowerCase();
    assert.ok(lines.includes('interaction'));
  });

  it('skips when age unknown', async () => {
    const { injectSeniorTips } = await import('@/lib/rules/seniorSafety');
    const cards = [{ lines: ['only'] }];
    const out = injectSeniorTips(cards, {});
    assert.equal(out[0].lines.length, 1);
  });
});
