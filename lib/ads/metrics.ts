import { kv } from '@/lib/kv';

const CPC_INR: Record<string, number> = { lal: 15, srl: 12, apollo: 8, onemg: 8, practo: 14 };

export async function recordPartnerEvent(partner: string, type: 'impression' | 'click', zone: string) {
  const p = partner || 'unknown';
  const key = `ads:partner:${p}`;
  const zoneKey = `ads:zone:${zone || 'unknown'}`;
  await Promise.all([
    kv.hincrby(key, type, 1),
    kv.hincrby('ads:totals', type, 1),
    kv.hincrby(zoneKey, type, 1),
  ]);
}

export async function getRevenueStats() {
  const totals = (await kv.hgetall<number>('ads:totals')) || { impression: 0, click: 0 };
  const partners = await kv.keys('ads:partner:*');
  const byPartner: Record<string, { imp: number; click: number; revInr: number }> = {};
  for (const k of partners) {
    const p = k.split(':').pop()!;
    const h = (await kv.hgetall<number>(k)) || {};
    const imp = Number(h.impression || 0);
    const click = Number(h.click || 0);
    byPartner[p] = { imp, click, revInr: click * (CPC_INR[p] || 0) };
  }
  const ctr = totals.impression ? Number(totals.click || 0) / Number(totals.impression) : 0;
  const revenueInr = Object.values(byPartner).reduce((s, v) => s + v.revInr, 0);
  return { totals, ctr, revenueInr, byPartner };
}
