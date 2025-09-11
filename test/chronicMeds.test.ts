import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getChronicMedEducation } from '@/lib/meds/chronic';

describe('chronic med education', () => {
  it('dedupes meds and notes unknowns', async () => {
    const { chronicMeds, skipped } = await getChronicMedEducation(['Metformin', 'metformin', 'FooBar']);
    assert.equal(chronicMeds.length, 1);
    assert.ok(chronicMeds[0].name.toLowerCase().includes('metformin'));
    assert.deepEqual(skipped, ['foobar']);
  });
});
