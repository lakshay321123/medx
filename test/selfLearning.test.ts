import path from 'path';

const logPath = path.join(process.cwd(), 'data', 'feedbackLogs.test.json');
process.env.FEEDBACK_LOG_PATH = logPath;

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { cosineSimilarity } from '@/lib/selfLearning/utils';
import { promises as fs } from 'fs';

describe('self-learning utils', () => {
  it('cosine similarity is near 1 for identical strings', () => {
    const s = cosineSimilarity('medical answer', 'medical answer');
    assert.ok(s > 0.99);
  });
});

describe('feedback loop', () => {
  it('flags divergence when similarity low', async () => {
    await fs.writeFile(logPath, '[]');
    const { evaluateResponseAccuracy } = await import('@/lib/selfLearning/feedbackLoop');
    const report = await evaluateResponseAccuracy('what is fever?', 'It is hot', 'baseline different');
    assert.ok(report.diverges);
    const logs = JSON.parse(await fs.readFile(logPath, 'utf8'));
    assert.equal(logs.length, 1);
    await fs.unlink(logPath);
  });
});
