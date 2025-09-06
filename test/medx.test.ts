import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeTopic } from '@/lib/topic/normalize';
import { filterTrials } from '@/lib/trials/search';
import { routeIntent } from '@/lib/intent-router';
import { normalizeQuery } from '@/lib/queryNormalizer';
import { normalizePhase, normalizeStatus, defaultTrialFilters } from '@/lib/trials/normalize';
import { dedupeTrials } from '@/lib/trials/merge';
import type { TrialRecord } from '@/lib/trials/types';

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

describe('query normalizer', () => {
  it('expands NSCLC', () => {
    assert.equal(normalizeQuery('NSCLC'), 'non-small cell lung cancer');
  });
});

describe('phase/status normalize', () => {
  it('normalizes values', () => {
    assert.equal(normalizePhase('PHASE II'), 'Phase 2');
    assert.equal(normalizeStatus('active, not recruiting'), 'Active, not recruiting');
  });
});

describe('trial dedupe', () => {
  it('merges by ID and fuzzily by title', () => {
    const a: TrialRecord = { ids: { nct: 'NCT1' }, title: 'A', condition: [], sources: [{ name: 'A', url: 'u' }] };
    const b: TrialRecord = { ids: { nct: 'NCT1' }, title: 'A', condition: [], phase: 'Phase 2', sources: [{ name: 'B', url: 'v' }] };
    const c: TrialRecord = { ids: {}, title: 'B', condition: [], phase: 'Phase 2', locations: [{ country: 'US' }], sources: [{ name: 'C', url: 'w' }] };
    const d: TrialRecord = { ids: {}, title: 'B', condition: [], phase: 'Phase 2', locations: [{ country: 'US' }], sources: [{ name: 'D', url: 'z' }] };
    const merged = dedupeTrials([[a], [b], [c], [d]]);
    assert.equal(merged.length, 2);
    const idMerged = merged.find(t => t.ids.nct === 'NCT1')!;
    assert.equal(idMerged.sources.length, 2);
    const fuzzyMerged = merged.find(t => !t.ids.nct)!;
    assert.equal(fuzzyMerged.sources.length, 2);
  });
});

describe('broaden filters', () => {
  it('expands phase and status when true', () => {
    const f = defaultTrialFilters(true);
    assert(/Phase 1/.test(f.phase));
    assert(/Completed/.test(f.status));
  });
});
