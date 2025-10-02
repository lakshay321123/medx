import { describe, expect, it } from 'vitest';
import { prepareAidocPayload, buildNarrativeFallback } from '@/lib/aidoc/planner';

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
