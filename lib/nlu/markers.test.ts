import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { classifyAct } from './markers';

test('classifies niceties as ack', () => {
  assert.equal(classifyAct('nice'), 'ack');
  assert.equal(classifyAct('Exactly.'), 'ack');
  assert.equal(classifyAct('thanks!!'), 'ack');
  assert.equal(classifyAct('great 👍'), 'ack');
});
