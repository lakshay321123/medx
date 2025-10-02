export function compactWhitespace(s: string): string {
  return s.replace(/[\t\r\f\v]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** collapse accidental token repeats like `242.2242.2242` or word.word */
export function dedupeRuns(s: string): string {
  return s
    .replace(/(\b[\w\.-]{2,})(?:\s*\1\b)+/g, "$1")
    .replace(/(\d{1,3}(?:[\.,]\d{1,3}){1,})(?:\1)+/g, "$1");
}

export function normalizeUnits(s: string): string {
  return s
    .replace(/\bmg\/dl\b/gi, "mg/dL")
    .replace(/\bmmol\/l\b/gi, "mmol/L")
    .replace(/\bu\/l\b/gi, "U/L")
    .replace(/\bg\/dl\b/gi, "g/dL");
}

export function sanitizeFreeText(input?: string | null): string {
  if (!input) return "";
  return normalizeUnits(compactWhitespace(dedupeRuns(String(input))));
}

/** Build `TestName Value Unit (Flag)` headline for lab items */
export function formatLabHeadline(meta: any, ob: any): string {
  const name = meta?.testName || ob?.name || ob?.value_text || "Lab";
  const value = ob?.value_num != null ? String(ob.value_num) : "";
  const unit = ob?.unit ? normalizeUnits(ob.unit) : "";
  const flag = (meta?.flags || meta?.abnormalHint || meta?.severity || meta?.priority || "")
    .toString()
    .trim();
  const flagLabel = flag ? ` (${flag.charAt(0).toUpperCase()}${flag.slice(1)})` : "";
  const head = [name, [value, unit].filter(Boolean).join(" ")].filter(Boolean).join(" ");
  return sanitizeFreeText((head + flagLabel).trim());
}
