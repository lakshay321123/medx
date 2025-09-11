import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { womensHealthInfo, womensHealthUsage } from '@/lib/womenshealth/basics';

test('womens health basics', () => {
  process.env.WOMENS_HEALTH_INFO = 'true';
  womensHealthUsage.irregular_periods = 0;
  womensHealthUsage.pregnancy_nutrition = 0;
  womensHealthUsage.postpartum_care = 0;
  const preg = womensHealthInfo('Need pregnancy nutrition advice');
  assert.ok(preg);
  assert.ok(preg?.womens_health.nutrition[0].includes('Folic acid'));
  assert.ok(preg?.womens_health.normal_symptoms[0].includes('Mild fatigue'));
  assert.ok(preg?.womens_health.red_flags[0].includes('Severe bleeding'));
  assert.equal(womensHealthUsage.pregnancy_nutrition, 1);

  process.env.WOMENS_HEALTH_INFO = 'true';
  womensHealthUsage.irregular_periods = 0;
  const irr = womensHealthInfo('my periods are irregular');
  assert.ok(irr);
  assert.ok(irr?.womens_health.red_flags[0].includes('No periods'));
  assert.equal(womensHealthUsage.irregular_periods, 1);

  process.env.WOMENS_HEALTH_INFO = 'false';
  const off = womensHealthInfo('pregnancy nutrition');
  assert.equal(off, null);
});
