import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeTopic } from '@/lib/topic/normalize';
import { routeIntent } from '@/lib/intent-router';
import { buildMedicationShortSummary } from '@/lib/meds/shortSummary';
import { chronicMedEducation } from '@/lib/meds/chronicEdu';

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

describe('medication micro-summary', () => {
  it('builds 2 line summary and serious line', () => {
    const out = buildMedicationShortSummary({
      use: 'Pain relief for mild to moderate pain',
      common: ['nausea', 'dizziness'],
      serious: ['rash', 'trouble breathing'],
      notes: 'Take with food',
    });
    assert.ok(out.summary.split('\n').length >= 2);
    assert.ok(out.serious.startsWith('Serious side-effects'));
    assert.ok(out.summary.length <= parseInt(process.env.MEDS_SHORT_SUMMARY_MAX_CHARS || '320'));
  });
});

describe('chronic medication education', () => {
  it('normalizes names, dedups and notes unknown', () => {
    const res = chronicMedEducation(['Glucophage', 'metformin', 'UnknownMed']);
    assert.equal(res.chronicMeds.length, 1);
    assert.equal(res.chronicMeds[0].name, 'Metformin');
    assert.deepEqual(res.unrecognized, ['UnknownMed']);
  });
});
