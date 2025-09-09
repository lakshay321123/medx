import type { Calculator, Registry } from "./types";

const REGISTRY: Registry = new Map();

export function register(calc: Calculator) {
  if (REGISTRY.has(calc.id)) return; // idempotent
  REGISTRY.set(calc.id, calc);
}

export function getAllCalculators(): Calculator[] {
  return Array.from(REGISTRY.values());
}

