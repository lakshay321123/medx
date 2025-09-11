import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { explainLabTest, getLabExplainerMetrics } from '../lib/labExplainers';

test('returns explainer for known test', () => {
  const info = explainLabTest('TSH');
  assert.ok(info);
  assert.equal(info!.name, 'TSH');
  assert.ok(info!.adult_range.includes('0.4'));
});

test('records miss for unknown test', () => {
  const before = getLabExplainerMetrics().misses;
  const res = explainLabTest('UnknownTest');
  assert.equal(res, null);
  const after = getLabExplainerMetrics().misses;
  assert.equal(after, before + 1);
});
