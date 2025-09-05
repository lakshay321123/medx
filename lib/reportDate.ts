export function extractReportDate(text: string): string | null {
  if (!text) return null;
  const labeled = [
    /(reported\s*(on|:)?\s*)(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /(collected\s*(on|:)?\s*)(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /(sampled\s*(on|:)?\s*)(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const rx of labeled) {
    const m = text.match(rx);
    if (m?.[3]) { const iso = normalizeDate(m[3]); if (iso) return iso; }
  }
  const any = text.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/);
  return any ? normalizeDate(any[1]) : null;
}
function normalizeDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw + "T00:00:00.000Z";
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2,"0"), mm = dmy[2].padStart(2,"0");
    const yyyy = dmy[3].length === 2 ? ("20"+dmy[3]) : dmy[3];
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }
  const ms = Date.parse(raw);
  return isNaN(ms) ? null : new Date(ms).toISOString();
}
