// Robust report-date extraction from OCR/PDF text or raw strings.
const DATE_RX = [
  // Labeled patterns
  /(report(ed)?|result|issued|dated|date|collected|sampled|drawn)\s*(on|:)?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?|\d{4}[-\/.]\d{2}[-\/.]\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|(?:\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{4})/i,
  /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\b/i,
  /\b(\d{4}[-\/.]\d{2}[-\/.]\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/i,
  // First date fallback
  /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/,
  /\b(\d{4}[-\/.]\d{2}[-\/.]\d{2})\b/,
  /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/,
];

export function extractReportDate(text: string): string | null {
  if (!text) return null;
  for (const rx of DATE_RX) {
    const m = text.match(rx);
    if (m) {
      const raw = (m as any)[4] ?? m[1] ?? m[0];
      const iso = normalizeDate(raw);
      if (iso) return iso;
    }
  }
  return null;
}

function normalizeDate(raw: string): string | null {
  const s = String(raw).replace(/\s+/g, " ").trim();
  const isoNoTime = (y: string, m: string, d: string) =>
    new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`).toISOString();
  const withTime = s.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );
  if (withTime) {
    let [, d, m, y, hh, mm, ss, ap] = withTime;
    const yyyy = y.length === 2 ? "20" + y : y;
    let hhNum = parseInt(hh, 10);
    if (ap) {
      const upper = ap.toUpperCase();
      if (upper === "PM" && hhNum < 12) hhNum += 12;
      if (upper === "AM" && hhNum === 12) hhNum = 0;
    }
    const iso = new Date(
      `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${String(hhNum).padStart(2, "0")}:${mm}:${ss || "00"}Z`
    ).toISOString();
    return iso;
  }
  if (/^\d{4}[-\/.]\d{2}[-\/.]\d{2}$/.test(s)) {
    const t = s.replace(/\./g, "-");
    return new Date(t + "T00:00:00Z").toISOString();
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const yyyy = y.length === 2 ? "20" + y : y;
    return isoNoTime(yyyy, m, d);
  }
  const ms = Date.parse(s);
  return isNaN(ms) ? null : new Date(ms).toISOString();
}
