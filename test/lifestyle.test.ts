import { test } from 'node:test';
import { strict as assert } from 'assert';
import { detectLifestyleQuery, getLifestyleTips } from '../lib/lifestyleTips';

test('detects wellness query when enabled', () => {
  process.env.LIFESTYLE_TIPS_ENABLED = 'true';
  assert.equal(detectLifestyleQuery('How to stay healthy?'), true);
});

test('returns false when disabled', () => {
  delete process.env.LIFESTYLE_TIPS_ENABLED;
  assert.equal(detectLifestyleQuery('How to stay healthy?'), false);
});

test('lifestyle tips structure', () => {
  const tips = getLifestyleTips();
  assert.ok(tips.lifestyle);
  assert.ok(Array.isArray(tips.lifestyle.nutrition));
});
