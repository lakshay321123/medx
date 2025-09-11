import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

describe('senior safety tips', () => {
  beforeEach(() => {
    process.env.SENIOR_SAFETY_TIPS = 'true';
    process.env.SENIOR_AGE_THRESHOLD = '65';
  });

  it('returns card with tips for seniors', async () => {
    const { injectSeniorTips } = await import(`@/lib/rules/seniorSafety?${Date.now()}`);
    const out = injectSeniorTips([], { age: 70 });
    assert.equal(out.length, 1);
    const card = (out[0] as any).senior_safety;
    assert.ok(card.home.length >= 2);
    assert.ok(card.medications.length >= 1);
    assert.ok(card.exercise.length >= 1);
  });

  it('skips when below age threshold', async () => {
    const { injectSeniorTips } = await import(`@/lib/rules/seniorSafety?${Date.now()}`);
    const out = injectSeniorTips([], { age: 60 });
    assert.equal(out.length, 0);
  });

  it('triggers when flagged as senior', async () => {
    const { injectSeniorTips } = await import(`@/lib/rules/seniorSafety?${Date.now()}`);
    const out = injectSeniorTips([], { flags: { senior: true } });
    assert.equal(out.length, 1);
  });

  it('skips when feature disabled', async () => {
    process.env.SENIOR_SAFETY_TIPS = 'false';
    const { injectSeniorTips } = await import(`@/lib/rules/seniorSafety?${Date.now()}`);
    const out = injectSeniorTips([], { age: 80 });
    assert.equal(out.length, 0);
  });
});
