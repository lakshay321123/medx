import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import path from 'path';

const fresh = () => import(`@/lib/meds/interactions?${Date.now()}`);

describe('drug interaction checker', () => {
  beforeEach(() => {
    process.env.DRUG_INTERACTIONS_ENABLED = 'true';
    process.env.DRUG_INTERACTION_RULES_PATH = path.join(process.cwd(), 'data/drug_interactions.json');
  });

  it('detects major interaction from rules', async () => {
    const { checkDrugInteractions } = await fresh();
    const res = await checkDrugInteractions(['warfarin', 'aspirin', 'aspirin']);
    assert.ok(res);
    assert.equal(res!.interactions.length, 1);
    const first = res!.interactions[0];
    assert.equal(first.severity, 'Major');
    assert.ok(first.pair.toLowerCase().includes('warfarin'));
    assert.ok(first.pair.toLowerCase().includes('aspirin'));
  });

  it('reports no interactions when none found', async () => {
    const { checkDrugInteractions } = await fresh();
    const res = await checkDrugInteractions(['vitamin c', 'acetaminophen']);
    assert.ok(res);
    assert.equal(res!.interactions.length, 0);
    assert.equal(res!.note, 'No major interactions known.');
  });

  it('handles api failure gracefully', async () => {
    process.env.DRUG_INTERACTION_RULES_PATH = path.join(process.cwd(), 'data/missing.json');
    const { checkDrugInteractions } = await fresh();
    const res = await checkDrugInteractions(['warfarin', 'aspirin']);
    assert.ok(res);
    assert.equal(res!.interactions.length, 0);
    assert.equal(res!.note, 'Interaction data unavailable.');
  });
});
