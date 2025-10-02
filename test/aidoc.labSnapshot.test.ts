import { describe, it, expect } from 'vitest';
import { detectLabSnapshotIntent, formatLabIntentResponse } from '../lib/aidoc/labsSnapshot';
import { normalizeAidocThreadType } from '../lib/aidoc/threadType';

describe('AI Doc lab intent detection', () => {
  it('detects snapshot intents with optional all qualifier', () => {
    const intent = detectLabSnapshotIntent('Compare all my reports');
    expect(intent).toEqual({ kind: 'snapshot' });
  });

  it('detects metric comparisons deterministically', () => {
    const intent = detectLabSnapshotIntent('compare my LDL results');
    expect(intent).toMatchObject({ kind: 'compare', metric: { code: 'LDL-C' } });
  });

  it('normalizes common AI Doc thread labels', () => {
    expect(normalizeAidocThreadType('Doc AI')).toBe('aidoc');
    expect(normalizeAidocThreadType('doc-mode')).toBe('aidoc');
    expect(normalizeAidocThreadType('AIDocPreview')).toBe('aidoc');
  });
});
import type { LabTrend } from '../lib/labs/summary';

const SAMPLE_TREND: LabTrend[] = [
  {
    test_code: 'LDL-C',
    test_name: 'LDL Cholesterol',
    unit: 'mg/dl',
    latest: { value: 172.3, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 165, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 172.3,
        unit: 'mg/dl',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 0,
        ref_high: 130,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 170,
        unit: 'mg/dl',
        sample_date: '2024-05-10T08:00:00.000Z',
        ref_low: 0,
        ref_high: 130,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 165,
        unit: 'mg/dl',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 0,
        ref_high: 130,
        status: null,
        flag: 'H',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'HDL-C',
    test_name: 'HDL Cholesterol',
    unit: 'mg/dl',
    latest: { value: 48, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 50, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 48,
        unit: 'mg/dl',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 40,
        ref_high: 100,
        status: 'normal',
        flag: 'N',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 50,
        unit: 'mg/dl',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 40,
        ref_high: 100,
        status: 'normal',
        flag: 'N',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'TG',
    test_name: 'Triglycerides',
    unit: 'mg/dl',
    latest: { value: 210, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 190, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 210,
        unit: 'mg/dl',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 0,
        ref_high: 150,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 190,
        unit: 'mg/dl',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 0,
        ref_high: 150,
        status: null,
        flag: 'H',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'ALT (SGPT)',
    test_name: 'ALT (SGPT)',
    unit: 'U/L',
    latest: { value: 220, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 200, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 220,
        unit: 'U/L',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 0,
        ref_high: 40,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 200,
        unit: 'U/L',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 0,
        ref_high: 40,
        status: null,
        flag: 'H',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'AST (SGOT)',
    test_name: 'AST (SGOT)',
    unit: 'U/L',
    latest: { value: 110, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 105, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 110,
        unit: 'U/L',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 0,
        ref_high: 40,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 105,
        unit: 'U/L',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 0,
        ref_high: 40,
        status: null,
        flag: 'H',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'HBA1C',
    test_name: 'HbA1c',
    unit: '%',
    latest: { value: 5.6, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 5.5, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 5.6,
        unit: '%',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 4,
        ref_high: 5.6,
        status: null,
        flag: 'N',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 5.5,
        unit: '%',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 4,
        ref_high: 5.6,
        status: null,
        flag: 'N',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
  {
    test_code: 'CRP',
    test_name: 'CRP',
    unit: 'mg/L',
    latest: { value: 12, sample_date: '2024-05-10T12:00:00.000Z' },
    previous: { value: 10, sample_date: '2023-12-01T00:00:00.000Z' },
    direction: 'worsening',
    series: [
      {
        value: 12,
        unit: 'mg/L',
        sample_date: '2024-05-10T12:00:00.000Z',
        ref_low: 0,
        ref_high: 5,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
      {
        value: 10,
        unit: 'mg/L',
        sample_date: '2023-12-01T00:00:00.000Z',
        ref_low: 0,
        ref_high: 5,
        status: null,
        flag: 'H',
        report_id: 'rep-20231201',
        document_id: 'doc-20231201',
      },
    ],
  },
];

const SINGLE_POINT_TREND: LabTrend[] = [
  {
    test_code: 'LDL-C',
    test_name: 'LDL Cholesterol',
    unit: 'mg/dl',
    latest: { value: 160, sample_date: '2024-05-10T00:00:00.000Z' },
    previous: null,
    direction: 'unknown',
    series: [
      {
        value: 160,
        unit: 'mg/dl',
        sample_date: '2024-05-10T00:00:00.000Z',
        ref_low: 0,
        ref_high: 130,
        status: null,
        flag: 'H',
        report_id: 'rep-20240510',
        document_id: 'doc-20240510',
      },
    ],
  },
];

describe('labs snapshot formatter', () => {
  it('formats a patient snapshot with grouped summaries and chips', () => {
    const response = formatLabIntentResponse(SAMPLE_TREND, { kind: 'snapshot' });
    const preview = response.split('\n').slice(0, 4).join('\n');
    console.log('> pull my reports\n' + preview);
    expect(response).toContain('## Patient Snapshot');
    expect(response).toMatch(/Cholesterol high/i);
    expect(response).toMatch(/Liver enzymes high/i);
    expect(response).toMatch(/Inflammation high/i);
    expect(response).toMatch(/\+1 more/);
    expect(response).toMatch(/LDL: 172\.3 mg\/dL/i);
    expect(response).not.toMatch(/170 mg\/dL/);
    expect(response).toMatch(/### What to do next/);
  });

  it('formats a comparison view for LDL', () => {
    const comparison = formatLabIntentResponse(SAMPLE_TREND, {
      kind: 'compare',
      metric: { code: 'LDL-C', label: 'LDL Cholesterol' },
    });
    const preview = comparison.split('\n').slice(0, 4).join('\n');
    console.log('> compare my LDL\n' + preview);
    expect(comparison).toContain('## Compare LDL');
    expect(comparison).toMatch(/2024/);
    expect(comparison).toMatch(/mg\/dL \(high\)/i);
    expect(comparison).toMatch(/### What to do next/);
  });

  it('notes when a comparison has only one data point', () => {
    const comparison = formatLabIntentResponse(SINGLE_POINT_TREND, {
      kind: 'compare',
      metric: { code: 'LDL-C', label: 'LDL Cholesterol' },
    });
    expect(comparison).toMatch(/Need ≥2 results to comment on a trend/);
  });

  it('detects snapshot intents from common phrases', () => {
    expect(detectLabSnapshotIntent('pull my reports')).toEqual({ kind: 'snapshot' });
    expect(detectLabSnapshotIntent('list my reports')?.kind).toBe('snapshot');
    expect(detectLabSnapshotIntent('how is my health overall')?.kind).toBe('snapshot');
    const compareIntent = detectLabSnapshotIntent('compare my LDL');
    expect(compareIntent).toEqual({ kind: 'compare', metric: { code: 'LDL-C', label: 'LDL Cholesterol' } });
  });
});
