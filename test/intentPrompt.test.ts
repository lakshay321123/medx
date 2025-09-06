import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent } from '@/lib/intentClassifier';
import { buildPrompt } from '@/lib/promptBuilder';


describe('intent classifier', () => {
  it('detects research intent', () => {
    const intent = detectIntent('latest clinical trials for diabetes');
    assert.equal(intent, 'research');
  });

  it('detects generate intent', () => {
    const intent = detectIntent('write a 5000 word paper on cancer');
    assert.equal(intent, 'generate');
  });
});

describe('prompt builder', () => {
  it('builds patient overview prompt', () => {
    const prompt = buildPrompt('diabetes', ['symptoms'], 'patient', 'overview', 'What are the symptoms?');
    assert(prompt.includes('Main Topic: diabetes'));
    assert(prompt.includes('Subtopics: symptoms'));
    assert(prompt.includes('Mode: patient'));
    assert(prompt.includes('Intent: overview'));
    assert(prompt.includes('Explain simply and clearly for a non-medical audience.'));
    assert(prompt.includes('Give a concise, accurate overview.'));
  });
});
