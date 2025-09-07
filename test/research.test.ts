import { test, expect } from 'vitest';
import { detectResearchIntent } from '../lib/detectResearch';
import { PatientSchema, DoctorSchema } from '../lib/schemas/medx';

test('research intent classifier triggers with keywords', () => {
  process.env.MEDX_MODES_V2 = '1';
  expect(detectResearchIntent('is there evidence or meta-analysis?')).toBe(true);
});

test('research intent classifier off when flag disabled', () => {
  delete process.env.MEDX_MODES_V2;
  expect(detectResearchIntent('need evidence for this?')).toBe(false);
});

test('patient evidence schema validates plain summary and reference', () => {
  const sample = {
    mode: 'patient',
    condition: 'diabetes',
    what_it_is: 'chronic condition',
    home_care: [],
    red_flags: ['a', 'b', 'c'],
    when_to_test: [],
    localization: { country: 'IN', units: 'metric' },
    references: [],
    evidence: {
      plain_summary: 'Studies show lifestyle changes help.',
      key_findings: ['finding'],
      practice_points: ['point'],
      level_of_evidence: ['high'],
      references: [{ name: 'WHO', url: 'https://who.int' }]
    }
  };
  const parsed = PatientSchema.parse(sample);
  expect(parsed.evidence?.plain_summary).toBeTruthy();
  const jargon = /(etiology|pathophysiology|efficacy|randomized)/i;
  expect(jargon.test(parsed.evidence!.plain_summary)).toBe(false);
  expect(parsed.evidence?.references.length).toBeTruthy();
});

test('doctor evidence schema validates clinical summary and metrics', () => {
  const sample = {
    mode: 'doctor',
    condition: 'hypertension',
    what_it_is: 'condition',
    differential: [],
    suggested_tests: [],
    initial_management: [],
    icd10_examples: [],
    localization: { country: 'IN', units: 'metric' },
    references: [],
    evidence: {
      clinical_summary: 'RCT showed ARR 5% with NNT=20.',
      metrics: ['NNT=20'],
      key_findings: ['kf'],
      practice_points: ['pp'],
      level_of_evidence: ['moderate'],
      references: [{ name: 'Lancet', url: 'https://lancet.com', year: 2020 }]
    }
  };
  const parsed = DoctorSchema.parse(sample);
  expect(parsed.evidence?.clinical_summary).toBeTruthy();
  expect(parsed.evidence?.metrics.length).toBeTruthy();
  const ref = parsed.evidence?.references[0];
  expect(ref?.year || ref?.doi).toBeTruthy();
});
