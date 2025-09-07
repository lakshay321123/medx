import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAiDocPrompt } from '@/lib/ai/prompts/aidoc';

test('prompt bans quoting labs >90d', () => {
  const p = buildAiDocPrompt({ profile: {}, labs: [], meds: [], conditions: [] });
  assert.match(p, /Do NOT quote lab values older than 90 days/i);
});
