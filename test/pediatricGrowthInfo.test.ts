import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { runPediatricGrowth } from '@/lib/medical/engine/calculators/pediatric_growth';

describe('pediatric growth info', () => {
  beforeEach(() => {
    process.env.PEDIATRIC_GROWTH_INFO = 'true';
  });

  it('returns tips when weight missing', () => {
    const r = runPediatricGrowth({ age_months: 36 });
    assert.ok(r);
    assert.equal(r?.percentile, undefined);
    assert.ok(r?.nutrition.length);
    assert.ok(r?.red_flags.includes('Add weight to compute growth percentile'));
  });

  it('computes percentile and red flags', () => {
    const r = runPediatricGrowth({ age_months: 36, weight_kg: 12 });
    assert.ok(r);
    assert.equal(r?.percentile, '40th');
    assert.ok(r?.nutrition.includes('3 meals + 2 snacks/day'));
    assert.ok(!r?.red_flags.length);
  });

  it('triggers red flag for low weight', () => {
    const r = runPediatricGrowth({ age_months: 36, weight_kg: 0.3 });
    assert.ok(r);
    assert.ok(r?.red_flags.find(f => f.includes('3rd percentile')));
  });
});

