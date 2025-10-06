import { describe, it, expect, afterEach } from 'vitest';
import { POST } from '@/app/api/ads/broker/route';

const ROUTE_URL = 'http://test/route';
const originalAdsEnabled = process.env.ADS_ENABLED;
const originalAdsNoZones = process.env.ADS_NO_ZONES;

afterEach(() => {
  process.env.ADS_ENABLED = originalAdsEnabled;
  process.env.ADS_NO_ZONES = originalAdsNoZones;
});

describe('broker route validation', () => {
  it('415 when content-type is not application/json', async () => {
    const req = new Request(ROUTE_URL, { method: 'POST', body: '{}' });
    const res = await POST(req as any);
    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json).toEqual({ error: 'Content-Type must be application/json' });
  });

  it('400 on invalid JSON', async () => {
    const req = new Request(ROUTE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ bad json',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid JSON' });
  });

  it('defaults tier/zone when invalid', async () => {
    process.env.ADS_ENABLED = 'true';
    process.env.ADS_NO_ZONES = '';
    const req = new Request(ROUTE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'ldl high', tier: 'hacker', zone: 'void' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.card).toBeTruthy();
    expect(json.card.category).toBe('labs');
    expect(json.card.slot).toBe('inline');
  });
});
