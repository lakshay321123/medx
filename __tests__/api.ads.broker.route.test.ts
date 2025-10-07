import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/ads/broker/route';
import * as brokerMod from '@/lib/ads/broker';

vi.spyOn(brokerMod, 'broker').mockResolvedValue({ reason: 'no_fill' } as any);

function req(body: any, headers?: Record<string, string>) {
  return new Request('http://test/api/ads/broker', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('broker route', () => {
  it('415 without JSON content-type', async () => {
    const res = await POST(req({}, { 'content-type': 'text/plain' }) as any);
    expect(res.status).toBe(415);
  });

  it('400 on invalid JSON', async () => {
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ bad',
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  it('200 with defaults on invalid tier/zone', async () => {
    const res = await POST(req({ text: 'ldl', tier: 'xxx', zone: 'zzz' }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.card || json.reason).toBeTruthy();
  });
});
