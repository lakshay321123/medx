import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeTopic } from '@/lib/topic/normalize';
import { routeIntent } from '@/lib/intent-router';

describe('topic normalize', () => {
  it('maps slip disk to canonical', () => {
    const t = normalizeTopic('clinical trials for slip disk');
    assert.equal(t.canonical, 'intervertebral disc herniation');
    assert.ok(t.synonyms.includes('herniated disc'));
  });
});


describe('intent router', () => {
  it('detects doctor research intent for retinitis pigmentosa', () => {
    const r = routeIntent('treatment-focused trials Retinitis Pigmentosa');
    assert.equal(r.mode, 'doctor');
    assert.equal(r.research, true);
    assert.equal(r.audience, 'doctor');
    assert.equal(r.condition.toLowerCase(), 'retinitis pigmentosa');
  });
  it('reuses previous topic when asking trials', () => {
    const r = routeIntent('trials?', { mode: 'doctor', condition: 'back pain' });
    assert.equal(r.condition, 'back pain');
    assert.equal(r.new_case, false);
    assert.equal(r.research, true);
  });
});
