import { test } from 'node:test';
import assert from 'node:assert';

process.env.SYMPTOM_TRACKER = 'true';
process.env.GUIDELINE_SUMMARIES = 'true';
process.env.GUIDELINE_DEFAULT_LANG = 'en';
process.env.FITNESS_REHAB_PLANS = 'true';
process.env.DIET_TEMPLATES = 'true';
process.env.TEMPLATES_DEFAULT_LANG = 'en';
process.env.MEDX_TEST_USER_ID = 'user1';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';

// stub supabase client
const store = new Map<string, any>();
const sdk = require('@supabase/supabase-js');
sdk.createClient = () => ({
  from: () => ({
    upsert: async (row: any) => {
      const key = `${row.user_id}|${row.ts}|${row.name}`;
      store.set(key, row);
      return { data: [row], error: null };
    },
    select: () => ({
      params: {},
      eq(this: any, col: string, val: any) { this.params[col] = val; return this; },
      gte(this: any, _c: string, val: any) { this.params.from = val; return this; },
      lte(this: any, _c: string, val: any) { this.params.to = val; return this; },
      order(this: any) {
        const rows = Array.from(store.values()).filter(r =>
          r.user_id === this.params.user_id &&
          r.name === this.params.name &&
          r.ts >= this.params.from &&
          r.ts <= this.params.to
        ).sort((a,b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        return { data: rows, error: null };
      }
    })
  })
});

const { POST, GET: getTimeline } = require('../app/api/symptoms/timeline/route');
const { GET: getGuideline } = require('../app/api/guidelines/summary/route');
const { GET: getFitness } = require('../app/api/fitness/plans/route');
const { GET: getDiet } = require('../app/api/diet/templates/route');

const json = (res: Response) => res.json() as Promise<any>;

// ---- Symptom timeline tests ----

test('symptom timeline deduplicates entries', async () => {
  const body = { name: 'headache', severity: 3, ts: '2025-09-10T18:30:00Z' };
  const makeReq = () => new Request('http://test', { method: 'POST', body: JSON.stringify(body) });
  await POST(makeReq() as any);
  await POST(makeReq() as any);
  const res = await getTimeline(new Request('http://test?name=headache&from=2025-09-01&to=2025-09-30') as any);
  const data = await json(res as any);
  assert.equal(data.series.length, 1);
});

test('symptom timeline respects range filters', async () => {
  const req = new Request('http://test', { method: 'POST', body: JSON.stringify({ name: 'headache', severity: 2, ts: '2025-09-01T10:00:00Z' }) });
  await POST(req as any);
  const res = await getTimeline(new Request('http://test?name=headache&from=2025-09-05&to=2025-09-30') as any);
  const data = await json(res as any);
  assert.equal(data.series.length, 1);
  assert.equal(data.series[0].severity, 3);
});

// ---- Guideline summaries ----

test('guideline summaries fall back to default language', async () => {
  const res = await getGuideline(new Request('http://test?slug=ada-diabetes-2024&lang=fr') as any);
  const body = await json(res as any);
  assert.equal(body.meta.lang, 'en');
  assert.equal(body.bullets.length, 2);
  assert.ok(body.references.length > 0);
});

test('guideline summaries 404 on unknown slug', async () => {
  const res = await getGuideline(new Request('http://test?slug=unknown') as any);
  assert.equal(res.status, 404);
});

// ---- Fitness & diet templates ----

test('fitness plan returns plan', async () => {
  const res = await getFitness(new Request('http://test?condition=arthritis&lang=en') as any);
  const body = await json(res as any);
  assert.equal(body.plan.title, 'Arthritis rehab (2 weeks)');
});

test('diet template falls back to default language', async () => {
  const res = await getDiet(new Request('http://test?condition=diabetes&lang=fr') as any);
  const body = await json(res as any);
  assert.equal(body.meta.lang, 'en');
  assert.ok(body.plan.title);
});

test('fitness plan 404 for unknown condition', async () => {
  const res = await getFitness(new Request('http://test?condition=unknown') as any);
  assert.equal(res.status, 404);
});
