# MedX Engine Test Suite (Scaffold)

This adds a broad **smoke suite** across all registered calculators plus **targeted math tests** for core acid–base and osmolality logic.

## Files added
- `tests/registry.test.ts` — registry/id integrity checks.
- `tests/helpers.ts` — heuristic input generator.
- `tests/smoke_all_calculators.test.ts` — runs every calculator with safe defaults and validates result shape.
- `tests/acid_base_core.test.ts` — golden tests for anion gap, albumin-corrected AG, Winter's formula.
- `tests/osmolality.test.ts` — golden test for calculated osmolality + gap.

## How to run
Assuming you already run tests with Jest/ts-jest:

```bash
npm test
# or
npm run test
```

If you don’t have a Jest config yet, add:

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
};
```

> Tip: The smoke suite is intentionally tolerant — a calculator may return `null` if inputs are insufficient, but it **must not throw**.
