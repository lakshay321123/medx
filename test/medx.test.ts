import { describe, it, expect } from 'vitest';
import { normalizeTopic } from '@/lib/topic/normalize';
import { filterTrials } from '@/lib/trials/search';
import { routeIntent } from '@/lib/intent-router';

describe('topic normalize', () => {
  it('maps slip disk to canonical', () => {
    const t = normalizeTopic('clinical trials for slip disk');
    expect(t.canonical).toBe('intervertebral disc herniation');
    expect(t.synonyms.includes('herniated disc')).toBe(true);
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
    expect(filtered.length).toBe(2);
    filtered.forEach(t => {
      const title = t.title.toLowerCase();
      expect(/disc|radiculopathy/.test(title)).toBe(true);
      expect(/lumbar|cervical|spine/.test(title)).toBe(true);
      expect(/hip|arthroplasty/.test(title)).toBe(false);
    });
  });
});

describe('intent router', () => {
  it('detects doctor research intent for retinitis pigmentosa', () => {
    const r = routeIntent('treatment-focused trials Retinitis Pigmentosa');
    expect(r.mode).toBe('doctor');
    expect(r.research).toBe(true);
    expect(r.audience).toBe('doctor');
    expect(r.condition.toLowerCase()).toBe('retinitis pigmentosa');
  });
  it('reuses previous topic when asking trials', () => {
    const r = routeIntent('trials?', { mode: 'doctor', condition: 'back pain' });
    expect(r.condition).toBe('back pain');
    expect(r.new_case).toBe(false);
    expect(r.research).toBe(true);
  });
});
