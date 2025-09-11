import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAllergies } from '@/lib/allergy/check';

describe('allergy checker', () => {
  it('flags cross-reactive medications', async () => {
    const res = await checkAllergies(['Ibuprofen'], ['Aspirin']);
    assert.equal(res.allergyCheck[0].item, 'Ibuprofen');
    assert.match(res.allergyCheck[0].risk, /aspirin/i);
    assert.equal(res.allergyCheck[0].severity, 'moderate');
  });

  it('notes unknown items', async () => {
    const res = await checkAllergies(['Quinoa'], ['Peanut']);
    assert.equal(res.allergyCheck[0].risk, 'No data available');
  });

  it('prompts to add allergies when none recorded', async () => {
    const res = await checkAllergies(['Peanut'], []);
    assert.match(res.note, /add allergies/i);
  });
});
