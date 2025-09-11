import { test } from 'node:test';
import { strict as assert } from 'assert';
import { detectConditionCarePack, getConditionCarePack } from '../lib/conditionCarePacks';

test('detects condition care pack query when enabled', () => {
  process.env.CONDITION_CARE_PACKS = 'true';
  const cond = detectConditionCarePack('I have type 2 diabetes');
  assert.equal(cond, 'type 2 diabetes');
});

test('detection disabled when flag off', () => {
  delete process.env.CONDITION_CARE_PACKS;
  const cond = detectConditionCarePack('I have hypertension');
  assert.equal(cond, null);
});

test('care pack structure and region refs', () => {
  const pack = getConditionCarePack('type 2 diabetes', 'us');
  assert.equal(pack.carePack.condition, 'Type 2 Diabetes');
  assert.ok(Array.isArray(pack.carePack.lifestyle));
  assert.ok(pack.carePack.references[0].includes('cdc'));
  assert.ok(pack.carePack.legal);
});
