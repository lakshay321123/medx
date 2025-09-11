import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { firstAidCard } from '@/lib/firstaid/cards';

describe('first aid cards', () => {
  beforeEach(() => {
    process.env.FIRST_AID_FLOW = 'true';
  });

  it('returns bee sting card', () => {
    const r = firstAidCard('I have a bee sting');
    assert.ok(r);
    assert.equal(r?.card.title, 'First Aid: Bee Sting');
    assert.ok(r.card.steps.length <= 5);
    assert.ok(r.card.legal.includes('General information only'));
  });

  it('returns generic card for unknown injury', () => {
    const r = firstAidCard('I hurt myself');
    assert.ok(r);
    assert.equal(r?.card.title, 'First Aid: General Advice');
  });

  it('returns null when disabled', () => {
    process.env.FIRST_AID_FLOW = 'false';
    const r = firstAidCard('bee sting');
    assert.equal(r, null);
  });
});
