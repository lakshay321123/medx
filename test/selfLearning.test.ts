import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '@/lib/selfLearning/utils';

describe('self-learning utils', () => {
  it('cosine similarity is near 1 for identical strings', () => {
    const s = cosineSimilarity('medical answer', 'medical answer');
    expect(s > 0.99).toBe(true);
  });
});

describe('feedback loop', () => {
  it('flags divergence when similarity low', async () => {
    const { evaluateResponseAccuracy } = await import('@/lib/selfLearning/feedbackLoop');
    const report = await evaluateResponseAccuracy('what is fever?', 'It is hot', { baselineAnswer: 'baseline different' });
    expect(report.diverges).toBe(true);
  });
});
