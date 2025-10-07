import { describe, it, expect, beforeEach } from 'vitest';
import { broker } from '@/lib/ads/broker';

beforeEach(() => {
  delete process.env.ADS_NO_ZONES;
  process.env.ADS_REGION_DEFAULT = 'IN-DL';
});

describe('broker gating', () => {
  it('disabled when ADS_ENABLED=false', async () => {
    process.env.ADS_ENABLED = 'false';
    const r = await broker({ text: 'ldl', region: 'IN-DL', tier: 'free', zone: 'chat' });
    expect(r.reason).toBe('disabled');
  });

  it('zone blocked', async () => {
    process.env.ADS_ENABLED = 'true';
    process.env.ADS_NO_ZONES = 'reports,aidoc';
    const r = await broker({ text: 'ldl', region: 'IN-DL', tier: 'free', zone: 'reports' });
    expect(r.reason).toBe('zone_blocked');
  });

  it('returns something in chat (card or no_fill)', async () => {
    process.env.ADS_ENABLED = 'true';
    const r = await broker({ text: 'cholesterol', region: 'IN-DL', tier: 'free', zone: 'chat' });
    expect(Boolean(r.card) || r.reason === 'no_fill').toBe(true);
  });
});
