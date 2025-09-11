import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

describe('vaccine intent and summary', () => {
  it('detects vaccine queries', async () => {
    const { detectFollowupIntent } = await import('@/lib/intents');
    assert.equal(detectFollowupIntent('should I get the flu shot?'), 'vaccines');
    assert.equal(detectFollowupIntent('Tell me about the Hep B vaccine'), 'vaccines');
  });

  it('returns summary info', async () => {
    const { getVaccineSummary } = await import('@/lib/vaccines/summary');
    const r = getVaccineSummary({ name: 'flu shot', country: 'US' });
    assert.equal(r.vaccine.name.toLowerCase(), 'influenza');
    assert.ok(r.vaccine.schedule_link.includes('cdc.gov'));
    assert.ok(r.vaccine.references.length >= 1);
  });
});
