import { test } from 'node:test';
import assert from 'node:assert';
process.env.AI_HEALTH_COACH = process.env.AI_HEALTH_COACH || "true";
process.env.RESEARCH_SUMMARIZER = process.env.RESEARCH_SUMMARIZER || "true";

import { POST as translate } from "../app/api/translate/route";
import { POST as riskScore } from "../app/api/risk-score/route";
import { GET as coachToday } from "../app/api/coach/today/route";
import { GET as researchSummary } from "../app/api/research/summary/route";
import { GET as deviceGuide } from "../app/api/device-guide/route";

const json = (res: Response) => res.json() as Promise<any>;

test('translate api returns cached translation', async () => {
  const makeReq = () => new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello', lang: 'es', id: '1' })
  });
  const res1 = await translate(makeReq() as any);
  const body1 = await json(res1 as any);
  assert.equal(body1.translated, '[es] Hello');
  const res2 = await translate(makeReq() as any);
  const body2 = await json(res2 as any);
  assert.equal(body2.translated, '[es] Hello');
});

test('risk score api computes high risk', async () => {
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ age: 65, bp: 150, lipids: { total: 200, hdl: 40 }, smoker: true, diabetic: true, height_cm: 170, weight_kg: 80 })
  });
  const res = await riskScore(req as any);
  const body = await json(res as any);
  assert.equal(body.riskLevel, 'high');
});

test("coach tip api caches per day", async () => {
  const res1 = await coachToday(
    new Request("http://test", { headers: { "x-user-id": "u1" } }) as any
  );
  const body1 = await json(res1 as any);
  const res2 = await coachToday(
    new Request("http://test", { headers: { "x-user-id": "u1" } }) as any
  );
  const body2 = await json(res2 as any);
  assert.ok(body1.tip);
  assert.equal(body1.tip, body2.tip);
});

test("coach tip api falls back on error", async () => {
  process.env.COACH_FORCE_ERROR = "1";
  const res = await coachToday(new Request("http://test") as any);
  const body = await json(res as any);
  assert.equal(body.tip, "Stay active today.");
  delete process.env.COACH_FORCE_ERROR;
});

test("research summary api returns bullets", async () => {
  const res = await researchSummary(new Request("http://test?pmid=123") as any);
  const body = await json(res as any);
  assert.ok(Array.isArray(body.bullets));
  assert.ok(body.bullets.length <= 5);
  assert.ok("title" in body);
  assert.ok(body.link && body.link.includes("123"));
});

test('device guide api returns steps', async () => {
  const res = await deviceGuide(new Request('http://test?device=bp') as any);
  const body = await json(res as any);
  assert.ok(body.steps.length > 0);
});
