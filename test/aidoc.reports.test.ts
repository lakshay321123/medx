import { describe, expect, test } from 'vitest';
import { buildStructuredAidocResponse } from '../lib/aidoc/structured';
import { AiDocIntent } from '../lib/aidoc/schema';
import { SAMPLE_AIDOC_DATA } from './fixtures/aidoc.sample';

const bundle = {
  ...SAMPLE_AIDOC_DATA,
  medications: [{ name: 'Timolol' }],
  conditions: [{ label: 'Hypertension', status: 'active' }],
  notes: [
    {
      body: 'Symptoms: Hair loss',
      createdAt: '2025-04-01',
    },
    {
      body: 'Fracture report: Right forearm fracture, radius shaft. Healed with immobilization.',
      createdAt: '2025-07-15',
    },
  ],
  labs: [
    ...SAMPLE_AIDOC_DATA.labs.map(lab => ({ ...lab, refHigh: lab.name === 'LDL' ? 160 : lab.name === 'HbA1c' ? 6.0 : undefined })),
  ],
};

describe('Structured reports', () => {
  test('pull my reports returns multiple dated reports', () => {
    const result = buildStructuredAidocResponse({
      ...bundle,
      message: 'pull my reports',
      intent: AiDocIntent.PullReports,
    });
    expect(result.kind).toBe('reports');
    const dates = result.reports.map(report => report.date);
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).toBeGreaterThan(1);
  });

  test('compare LDL yields comparison entry', () => {
    const result = buildStructuredAidocResponse({
      ...bundle,
      message: 'compare LDL',
      intent: AiDocIntent.CompareMetric,
    });
    expect(result.comparisons['LDL']).toBeTruthy();
  });

  test('health summary not empty', () => {
    const result = buildStructuredAidocResponse({
      ...bundle,
      message: 'how is my health?',
      intent: AiDocIntent.HealthSummary,
    });
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test('interpret fracture report handled', () => {
    const result = buildStructuredAidocResponse({
      ...bundle,
      message: 'fracture report',
      intent: AiDocIntent.InterpretReport,
    });
    expect(result.intent).toBe(AiDocIntent.InterpretReport);
    expect(result.summary.toLowerCase()).toContain('fracture');
    expect(result.reports[0]?.summary.toLowerCase()).toContain('fracture');
  });
});
