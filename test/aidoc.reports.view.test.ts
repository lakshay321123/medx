import { describe, expect, it } from 'vitest';
import { prepareAidocPayload, buildNarrativeFallback, compareTrend } from '@/lib/aidoc/planner';
import { AidocReportViewer } from '@/components/aidoc/ReportViewer';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import * as React from 'react';

(globalThis as any).React = React;

const baseLabs = [
  { profileId: 'userA', name: 'LDL', value: 160, unit: 'mg/dL', takenAt: '2025-05-01' },
  { profileId: 'userA', name: 'LDL', value: 182, unit: 'mg/dL', takenAt: '2025-10-01' },
  { profileId: 'userA', name: 'HbA1c', value: 6.1, unit: '%', takenAt: '2025-10-01' },
  { profileId: 'userA', name: 'ALT', value: 60, unit: 'U/L', takenAt: '2025-10-01' },
  { profileId: 'userA', name: 'Vitamin D', value: 22, unit: 'ng/mL', takenAt: '2025-10-01' },
];

const notes = [
  { profileId: 'userA', body: 'Symptoms: fatigue, joint pain', createdAt: '2025-10-02' },
];

const medications = [{ profileId: 'userA', name: 'Metformin' }];
const conditions = [{ profileId: 'userA', label: 'Type 2 Diabetes', status: 'active' }];

const profile = { id: 'userA', name: 'Lakshay Mehra', age: 32 };

describe('Aidoc report planner', () => {
  it('pull reports returns multiple dated reports', () => {
    const payload = prepareAidocPayload({
      profile,
      labs: baseLabs,
      notes,
      medications,
      conditions,
      intent: 'pull_reports',
    });
    const uniqueDates = new Set(payload.reports.map(report => report.date));
    expect(uniqueDates.size).toBeGreaterThan(1);
  });

  it('decorates labs with marker and ideal ranges', () => {
    const payload = prepareAidocPayload({
      profile,
      labs: baseLabs,
      notes,
      medications,
      conditions,
      intent: 'pull_reports',
    });
    const allLabs = payload.reports.flatMap(report => report.labs);
    expect(allLabs.length).toBeGreaterThan(0);
    for (const lab of allLabs) {
      expect(typeof lab.marker).toBe('string');
      expect(lab.marker.length).toBeGreaterThan(0);
      expect(typeof lab.ideal === 'string' && lab.ideal.length > 0).toBe(true);
    }
  });

  it('produces comparisons and a non-empty fallback summary', () => {
    const payload = prepareAidocPayload({
      profile,
      labs: baseLabs,
      notes,
      medications,
      conditions,
      intent: 'pull_reports',
    });
    expect(Object.keys(payload.comparisons).length).toBeGreaterThan(0);
    const fallback = buildNarrativeFallback(payload);
    expect(fallback.summary.length).toBeGreaterThan(0);
  });

  it('filters cross-profile data to prevent leaks', () => {
    const payload = prepareAidocPayload({
      profile,
      labs: [
        ...baseLabs,
        { profileId: 'userB', name: 'LDL', value: 140, unit: 'mg/dL', takenAt: '2025-01-01' },
      ],
      notes,
      medications,
      conditions,
      intent: 'pull_reports',
    });
    const allReports = payload.reports;
    expect(allReports.every(report => report.labs.every(lab => lab.name))).toBe(true);
    const hasForeignDate = allReports.some(report => report.date === '2025-01-01');
    expect(hasForeignDate).toBe(false);
  });
});

describe('Aidoc helpers', () => {
  it('compareTrend skips readings from the same date when finding previous value', () => {
    const reports = [
      { date: '2025-10-01', summary: 'Latest', labs: [{ name: 'LDL', value: 180, unit: 'mg/dL', marker: 'High' }] },
      { date: '2025-10-01', summary: 'Duplicate same day', labs: [{ name: 'LDL', value: 170, unit: 'mg/dL', marker: 'High' }] },
      { date: '2025-05-01', summary: 'Earlier', labs: [{ name: 'LDL', value: 140, unit: 'mg/dL', marker: 'Normal' }] },
    ];
    const trend = compareTrend(reports as any, 'LDL');
    expect(trend).toContain('180');
    expect(trend).toContain('140');
    expect(trend).toContain('range 140-180');
  });

  it('viewer renders structured sections with separators', () => {
    const html = renderToStaticMarkup(
      createElement(AidocReportViewer, {
        patient: {
          name: 'Jane Doe',
          age: 45,
          predispositions: ['Family history of heart disease'],
          medications: ['Atorvastatin'],
          symptoms: ['Fatigue'],
        },
        reports: [
          {
            date: '2025-10-01',
            summary: 'LDL high; HbA1c borderline',
            labs: [
              { name: 'LDL', value: 182, unit: 'mg/dL', marker: 'High', ideal: '<160 mg/dL' },
              { name: 'HbA1c', value: 6.2, unit: '%', marker: 'Borderline', ideal: '<5.6 %' },
            ],
          },
        ],
        comparisons: { LDL: '182 (2025-10-01) ↑ from 160 (2025-05-01); range 160-182' },
        summary: 'Summary text',
        nextSteps: ['Follow up'],
      }),
    );
    expect(html).toContain('Report Dated —');
    expect(html).toContain('Summary: LDL high; HbA1c borderline');
    expect(html).toContain('Predispositions');
    expect(html).toContain('Family history of heart disease');
  });
});
