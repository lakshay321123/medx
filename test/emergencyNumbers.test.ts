import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { emergencyNumbers } from '@/lib/emergency';

describe('emergency numbers', () => {
  beforeEach(() => {
    process.env.EMERGENCY_CALL_BUTTONS = 'true';
  });

  it('returns numbers for US', () => {
    const nums = emergencyNumbers('us');
    assert.ok(nums);
    assert.equal(nums?.ambulance, '911');
  });

  it('returns null when disabled', () => {
    process.env.EMERGENCY_CALL_BUTTONS = 'false';
    const nums = emergencyNumbers('us');
    assert.equal(nums, null);
  });
});
