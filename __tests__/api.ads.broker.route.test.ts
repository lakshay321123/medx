import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/ads/broker/route';
import * as brokerMod from '@/lib/ads/broker';

// stub broker for route tests
vi.spyOn(brokerMod, 'broker').mockResolvedValue({ reason: 'no_fill' });

describe('broker route', () => {
  it('415 if content-type not application/json', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{}' });
    const res = (await POST(req as any)) as Response;
    expect(res.status).toBe(415);
  });

  it('400 on invalid JSON', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ bad',
    });
    const res = (await POST(req as any)) as Response;
    expect(res.status).toBe(400);
  });

  it('200 with safe defaults when tier/zone invalid', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'ldl high', tier: 'h4x', zone: 'void', region: 'in-dl' }),
    });
    const res = (await POST(req as any)) as Response;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reason === 'no_fill' || json.card).toBeTruthy();
  });
});
