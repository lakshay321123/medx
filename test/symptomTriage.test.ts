import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

describe('symptom triage', () => {
  beforeEach(() => {
    process.env.SYMPTOM_TRIAGE_ENABLED = 'true';
  });

  it('returns triage card for fever', async () => {
    const { symptomTriage } = await import('@/lib/triage');
    const r = symptomTriage({ symptom: 'fever' });
    assert.ok(r?.triage);
    const t = r!.triage;
    assert.equal(t.symptom, 'Fever');
    assert.ok(t.self_care.includes('Hydration'));
    assert.ok(t.er_now.length >= 1);
  });

  it('assumes adult when age missing', async () => {
    const { symptomTriage } = await import('@/lib/triage');
    const r = symptomTriage({ symptom: 'cough' });
    assert.ok(r?.triage.assumptions?.includes('assuming adult'));
  });
});
