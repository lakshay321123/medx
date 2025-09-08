export function normalizeAnswer(md: string) {
  let out = md.replace(/\n{3,}/g, "\n\n");
  if (!/\bSources\b/i.test(out) && /\bhttps?:\/\//.test(out) &&
      /\b(science|history|trial|guideline|study|randomized)\b/i.test(out)) {
    out += `\n\n_Sources requested but none detected — consider adding._`;
  }
  return out;
}

