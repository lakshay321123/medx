import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mentalHealthResources } from '@/lib/mentalhealth/resources';

describe('mental health resources', () => {
  beforeEach(() => {
    process.env.MENTAL_HEALTH_RESOURCES = 'true';
  });

  it('returns card for anxiety keywords', () => {
    const r = mentalHealthResources('I am having a panic attack and feel anxious', 'india');
    assert.ok(r);
    assert.ok(r?.mental_health.tips[0].includes('Box breathing'));
    assert.ok(r?.mental_health.helplines.some(h => h.includes('iCall')));
    assert.ok(r?.mental_health.red_flags[0].includes('Suicidal thoughts'));
  });

  it('falls back to global helplines when region unknown', () => {
    const r = mentalHealthResources("Can't sleep from stress", 'unknown');
    assert.ok(r);
    assert.ok(r.mental_health.helplines[0].includes('WHO'));
  });

  it('returns null when disabled', () => {
    process.env.MENTAL_HEALTH_RESOURCES = 'false';
    const r = mentalHealthResources('I feel depressed', 'us');
    assert.equal(r, null);
  });
});
