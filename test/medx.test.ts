import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeTopic } from '@/lib/topic/normalize';
import { filterTrials } from '@/lib/trials/search';
import { routeIntent } from '@/lib/intent-router';

describe('topic normalize', () => {
  it('maps slip disk to canonical', () => {
    const t = normalizeTopic('clinical trials for slip disk');
    assert.equal(t.canonical, 'intervertebral disc herniation');
    assert.ok(t.synonyms.includes('herniated disc'));
  });
});

describe('trial relevance filter', () => {
  it('keeps only on-topic trials for slip disk', () => {
    const topic = normalizeTopic('slip disk');
    const trials = [
      { title: 'Lumbar disc herniation surgery trial' },
      { title: 'Hip arthroplasty randomized study' },
      { title: 'Cervical radiculopathy treatment research' }
    ];
    const filtered = filterTrials(trials, topic);
    assert.equal(filtered.length, 2);
    filtered.forEach(t => {
      const title = t.title.toLowerCase();
      assert(/disc|radiculopathy/.test(title));
      assert(/lumbar|cervical|spine/.test(title));
      assert(!/hip|arthroplasty/.test(title));
    });
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
