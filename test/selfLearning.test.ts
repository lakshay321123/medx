import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { cosineSimilarity } from '@/lib/selfLearning/utils';

describe('self-learning utils', () => {
  it('cosine similarity is near 1 for identical strings', () => {
    const s = cosineSimilarity('medical answer', 'medical answer');
    assert.ok(s > 0.99);
  });
});

describe('feedback loop', () => {
  it('flags divergence when similarity low', async () => {
    const { evaluateResponseAccuracy } = await import('@/lib/selfLearning/feedbackLoop');
    const report = await evaluateResponseAccuracy('what is fever?', 'It is hot', { baselineAnswer: 'baseline different' });
    assert.ok(report.diverges);
  });
});
