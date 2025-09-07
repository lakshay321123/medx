import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRules } from '@/lib/aidoc/rules';

test('A1c stale triggers repeat instruction', () => {
  const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  const out = runRules({
    labs: [{ name: 'HbA1c', value: 7.6, takenAt: ninetyOneDaysAgo }],
    meds: [],
    conditions: [],
    mem: { prefs: [{ key: 'pref_test_time', value: 'morning' }] }
  });
  assert.match(out.steps.join(' '), /Repeat HbA1c/);
});
