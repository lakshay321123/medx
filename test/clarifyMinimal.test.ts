import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

describe('clarificationStep', () => {
  beforeEach(() => {
    process.env.CLARIFY_MINIMAL = 'true';
    process.env.CLARIFY_MAX_BACKTOBACK = '1';
  });

  it('asks for country in general med flow', async () => {
    const { clarificationStep } = await import('@/lib/conversation/clarify');
    const r = clarificationStep({ intent: 'general_med', previousClarifiersAsked: 0, userResponse: 'need paracetamol' });
    assert.equal(r.nextQuestion, 'Which country are you in?');
  });

  it('falls back to assumptions after max clarifiers', async () => {
    const { clarificationStep } = await import('@/lib/conversation/clarify');
    const r = clarificationStep({ intent: 'general_med', previousClarifiersAsked: 1, userResponse: null });
    assert.ok(r.provisionalAnswer);
    assert.ok(r.assumptions.includes('assuming adult'));
  });
});
