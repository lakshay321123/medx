import { test } from 'node:test';
import { strict as assert } from 'assert';
import { generateSecondOpinion } from '../lib/secondOpinion';

test('maps flags to questions when enabled', () => {
  process.env.SECOND_OPINION_MODE = 'true';
  const summary = { flags: ['liver_tests_high'] };
  const out = generateSecondOpinion(summary);
  assert.ok(out);
  assert.ok(out!.secondOpinion.questions.some(q => q.includes('liver tests')));
});

test('falls back to generic when no flags', () => {
  process.env.SECOND_OPINION_MODE = 'true';
  const out = generateSecondOpinion({});
  assert.ok(out);
  assert.ok(out!.secondOpinion.questions.length >= 5);
});

test('disabled mode returns null', () => {
  delete process.env.SECOND_OPINION_MODE;
  const out = generateSecondOpinion({ flags: ['liver_tests_high'] });
  assert.equal(out, null);
});
