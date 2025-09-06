import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent, parseQuickChoice } from '@/lib/intentClassifier';
import { buildPrompt } from '@/lib/promptBuilder';
import { normalizeQuery } from '@/lib/queryNormalizer';
import { correctTopic } from '@/lib/topicCorrector';


describe('intent classifier', () => {
  it('detects research intent', () => {
    const result = detectIntent('latest clinical trials for diabetes');
    assert.equal(result.intent, 'research');
    assert(result.confidence > 0.8);
  });

  it('detects generate intent', () => {
    const result = detectIntent('write a 5000 word paper on cancer');
    assert.equal(result.intent, 'generate');
    assert(result.confidence >= 0.8);
  });

  it('defaults to overview with low confidence', () => {
    const result = detectIntent('hello there');
    assert.equal(result.intent, 'overview');
    assert(result.confidence < 0.6);
  });

  it('parses quick choices', () => {
    assert.equal(parseQuickChoice('A'), 'research');
    assert.equal(parseQuickChoice('b'), 'resources');
    assert.equal(parseQuickChoice('③'), 'generate');
  });

  it('normalizes pronouns and corrects topics', () => {
    const norm = normalizeQuery('study it', 'leukemia');
    assert.equal(norm, 'study leukemia');
    const corrected = correctTopic('leukemai')!;
    assert.equal(corrected, 'leukemia');
  });
});

describe('prompt builder', () => {
  it('builds patient overview prompt', () => {
    const prompt = buildPrompt('diabetes', ['symptoms'], 'patient', 'overview', 'What are the symptoms?');
    assert(prompt.includes('Main Topic: diabetes'));
    assert(prompt.includes('Subtopics: symptoms'));
    assert(prompt.includes('Mode: patient'));
    assert(prompt.includes('Intent: overview'));
    assert(prompt.includes('Explain simply for a non-medical audience.'));
    assert(prompt.includes('Give a clear overview with key facts.'));
    assert(prompt.includes('Do not include clinical trial listings or reference-style summaries.'));
  });
});
