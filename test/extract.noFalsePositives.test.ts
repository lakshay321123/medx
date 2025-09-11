import { describe, it, expect, vi } from 'vitest';
vi.mock('../lib/medical/engine/calculators', () => ({}));
import { extractAll } from '../lib/medical/engine/extract';

describe('extractAll avoids false positives from plain-English text', () => {
  it('does not interpret "cold 4 days" as chloride=4', () => {
    const ctx = extractAll('I have a cold 4 days with dry cough. non-febrile.');
    expect(ctx.Cl == null || ctx.Cl === undefined).toBeTruthy();
    expect(ctx.Na == null || ctx.Na === undefined).toBeTruthy();
    expect(ctx.K == null || ctx.K === undefined).toBeTruthy();
  });
});

