// Minimal stubs for calculator page utilities used by triage.
// These are placeholders to satisfy imports; real implementations exist elsewhere.

export function looksCalculational(text: string): boolean {
  // naive check: presence of digits often implies calculational intent
  return /[0-9]/.test(text);
}

export function shouldBuildDocCalcPage(mode: string, text: string): boolean {
  return true;
}

export function buildDocCalcPage(text: string, bio: any, audience: string): string {
  // placeholder markdown output
  return `# Calculators\n\nInput: ${text}`;
}

export function parseCase(text: string): any {
  return {};
}

