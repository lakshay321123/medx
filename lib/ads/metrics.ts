import { getKv } from '@/lib/kv';

const CPC_INR: Record<string, number> = { lal: 15, srl: 12, apollo: 8, onemg: 8, practo: 14 };

type CounterHash = Record<string, string | number | null | undefined>;

type PartnerStats = { imp: number; click: number; revInr: number };

type RevenueStats = {
  totals: { impression: number; click: number };
  ctr: number;
  revenueInr: number;
  byPartner: Record<string, PartnerStats>;
};

function emptyStats(): RevenueStats {
  return {
    totals: { impression: 0, click: 0 },
    ctr: 0,
    revenueInr: 0,
    byPartner: {},
  };
}

export async function recordPartnerEvent(partner: string, type: 'impression' | 'click', zone: string) {
  const client = getKv();
  if (!client) return;

  const p = partner || 'unknown';
  const key = `ads:partner:${p}`;
  const zoneKey = `ads:zone:${zone || 'unknown'}`;

  await Promise.all([
    client.hincrby(key, type, 1),
    client.hincrby('ads:totals', type, 1),
    client.hincrby(zoneKey, type, 1),
  ]);
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const client = getKv();
  if (!client) return emptyStats();

  const totalsHash = (await client.hgetall<CounterHash>('ads:totals')) || {};
  const totals = {
    impression: Number(totalsHash.impression ?? 0),
    click: Number(totalsHash.click ?? 0),
  };
  const partners = await client.keys('ads:partner:*');
  const byPartner: Record<string, PartnerStats> = {};
  for (const k of partners) {
    const p = k.split(':').pop()!;
    const hash = (await client.hgetall<CounterHash>(k)) || {};
    const imp = Number(hash.impression ?? 0);
    const click = Number(hash.click ?? 0);
    byPartner[p] = { imp, click, revInr: click * (CPC_INR[p] || 0) };
  }
  const ctr = totals.impression ? totals.click / totals.impression : 0;
  const revenueInr = Object.values(byPartner).reduce((s, v) => s + v.revInr, 0);
  return { totals, ctr, revenueInr, byPartner };
}
