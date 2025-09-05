// lib/shortSummary.ts
// Build a compact 1–2 sentence clinical summary (≤ ~240 chars) from OCR text.
// Prefer abnormal lines with units or flag words; fall back to long summary;
// finally first meaningful sentence. Deterministic, no LLM.

const STOPWORDS = [
  "PHYSICAL EXAMINATION", "VISUAL EXAMINATION", "QUANTITY",
  "REFERENCE INTERVAL", "OBSERVED VALUE", "INVESTIGATION",
  "DEPARTMENT", "SPECIMEN", "REMARK"
];

const UNIT_RX = /\b(%|mg\/?d?l|mmol\/?l|g\/?dl|mIU\/?L|IU\/?L|U\/?L|ng\/?ml|pg\/?ml|cells?\/?µ?L|mm\/?hr|mL\/?min)\b/i;
const FLAG_RX = /\b(high|low|elevated|decreased|positive|negative|reactive|detected|abnormal)\b/i;

function clean(s: string) {
  return (s || "").replace(/\s+/g, " ").replace(/\s*[:\-–]\s*$/, "").trim();
}
function isMeaningful(l: string) {
  if (!l) return false;
  const up = l.toUpperCase();
  if (STOPWORDS.some(w => up.includes(w))) return false;
  return /[A-Za-z]/.test(l);
}
function cap(s: string, max = 240) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.replace(/\s+\S*$/, "") + "…";
}

export function buildShortSummaryFromText(text?: string, longSummary?: string): string | undefined {
  const raw = (text || "").replace(/\r/g, "\n");
  const lines = raw.split(/\n+/).map(clean).filter(Boolean);

  // 1) Prefer abnormal/units lines (up to 3)
  const abnormal = lines.filter(l => (UNIT_RX.test(l) && /\d/.test(l)) || FLAG_RX.test(l));
  const picks1 = abnormal.filter(isMeaningful).slice(0, 3);
  if (picks1.length) return cap(picks1.join("; "));

  // 2) Fall back to first 1–2 meaningful lines from long summary
  if (longSummary) {
    const paras = longSummary.split(/\n+/).map(clean).filter(Boolean);
    const leaf = paras.filter(p => !/^\*{2}.+\*{2}$/.test(p)); // drop "**Headings**"
    const picks2 = leaf.filter(isMeaningful).slice(0, 2);
    if (picks2.length) return cap(picks2.join(" "));
  }

  // 3) Last resort: first sentence from OCR text
  const firstSent = clean((text || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)[0] || "");
  return firstSent ? cap(firstSent) : undefined;
}
