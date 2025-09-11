import { describe, it, expect, vi } from 'vitest';
vi.mock('../lib/medical/engine/calculators', () => ({}));
import { computeAll } from '../lib/medical/engine/computeAll';
import { register, FORMULAE } from '../lib/medical/engine/registry';

describe('computeAll filters NaN', () => {
  it('skips results whose value is NaN', () => {
    const before = FORMULAE.length;
    register({
      id: 'nan_demo',
      label: 'NaN demo',
      inputs: [],
      run: () => ({ id: 'nan_demo', label: 'NaN demo', value: NaN, notes: [] })
    });
    const out = computeAll({});
    expect(out.map(r => r.id)).not.toContain('nan_demo');
    FORMULAE.splice(before);
  });
});
