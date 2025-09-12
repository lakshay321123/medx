import test from 'node:test';
import assert from 'node:assert/strict';
import { runCalcAuthoritative } from '../lib/medical/engine/verification/authoritativeRunner';

test('anion gap exact', async () => {
  const { final } = await runCalcAuthoritative('anion_gap', { Na: 140, Cl: 100, HCO3: 24 });
  assert.strictEqual(final, 16);
});

test('serum osmolality with mmol/L glucose', async () => {
  const { final } = await runCalcAuthoritative('serum_osmolality', { Na: 134, glucose_mmol_l: 12.2, BUN_mgdl: 40 });
  assert.ok(Math.abs(Number(final.toFixed(2)) - 294.49) < 0.01);
});
