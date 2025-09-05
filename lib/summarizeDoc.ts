// Deterministic long-summary (~600–900 words) for medical PDFs/OCR
type Section = { title: string; bullets: string[] };

const MAX_BULLETS = 14;
const MAX_PER_SYSTEM = 6;
const MAX_SUMMARY_CHARS = 7000;

const systems = [
  { key: "Liver", cues: [/bilirubin/i, /\balt\b/i, /\bast\b/i, /\bggt\b/i, /alkaline\s+phosphatase/i, /\balp\b/i] },
  { key: "Renal", cues: [/\begfr\b/i, /creatinine/i, /urea/i, /bun/i, /uric acid/i] },
  { key: "Lipid", cues: [/\bldl\b/i, /\bhdl\b/i, /triglycerides?/i, /\bcholesterol\b/i, /\bnon[- ]hdl\b/i, /\bapob\b/i] },
  { key: "Glycemic", cues: [/hba1c/i, /fasting\s*glucose/i, /fpg\b/i, /ppg\b/i, /average\s*glucose/i] },
  { key: "Thyroid", cues: [/\btsh\b/i, /\bt3\b/i, /\bt4\b/i, /free\s*(t3|t4)/i] },
  { key: "Inflammation", cues: [/\bcrp\b/i, /\besr\b/i, /ferritin/i] },
  { key: "Hematology", cues: [/hemoglobin/i, /\bhb\b/i, /\bwbc\b/i, /\brbc\b/i, /platelets?/i, /\bplt\b/i, /mcv\b/i] },
  { key: "Vitamin", cues: [/vitamin\s*d\b/i, /vitamin\s*b12\b/i, /\bfolate\b/i] },
];

const dateRe = /(?:(?:Reported|Collected|Sample\s*(?:On|Date)|Report\s*Date|Test\s*Date)[:\s]*)?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})/i;
const refRe  = /\b(?:ref(?:erence)?\s*(?:range|interval)|range)\b[:\s]*([^\n]*)/i;

function getLines(text: string): string[] {
  const raw = text.replace(/\r/g, "\n").replace(/[^\S\n]+/g, " ").split(/\n+/)
    .map(s => s.trim()).filter(Boolean);
  const drop = [/page\s*\d+\s*of\s*\d+/i, /confidential/i, /electronically\s+generated/i, /barcode/i, /specimen/i, /department/i, /remarks?:?/i, /investigation/i];
  return raw.filter(l => !drop.some(rx => rx.test(l)));
}
function first<T>(arr: T[], pred: (x: T) => boolean): T | undefined { for (const a of arr) if (pred(a)) return a; }
function extractHeader(text: string) {
  const lines = getLines(text);
  const date = first(lines, l => dateRe.test(l));
  const title = first(lines, l => /(?:health|lab|diagnostic|report|summary)/i.test(l)) || "Medical Document";
  return { title: title.replace(/\s{2,}/g, " ").trim(), date: date ? (date.match(dateRe)?.[1] || "").trim() : "" };
}
function bulletize(line: string) {
  const ref = line.match(refRe);
  const clean = line.replace(/\t/g, " ").replace(/\s{2,}/g, " ").replace(/[:\-–]\s*$/,"" ).trim();
  return ref ? `${clean}` : clean;
}
function pickHighlights(lines: string[]): string[] {
  const unitish = /\b(%|mg\/?d?l|mmol\/?l|g\/?dl|mIU\/?L|IU\/?L|U\/?L|ng\/?ml|pg\/?ml|cells?\/?µ?L|mm\/?hr)\b/i;
  const abnormal = /\b(high|low|abn(?:ormal)?|reactive|positive|negative|detected|elevated|decreased)\b/i;
  const cand = lines.filter(l => /\d/.test(l) && (unitish.test(l) || abnormal.test(l)));
  const seen = new Set<string>(); const out: string[] = [];
  for (const c of cand) { const key=c.toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,80);
    if (!seen.has(key)) { seen.add(key); out.push(bulletize(c)); }
    if (out.length >= MAX_BULLETS) break;
  }
  return out;
}
function groupBySystem(lines: string[]) {
  const bag: Record<string, string[]> = {};
  for (const {key, cues} of systems) {
    for (const l of lines) if (cues.some(rx => rx.test(l))) {
      (bag[key] ||= []).length < MAX_PER_SYSTEM && bag[key]!.push(bulletize(l));
    }
    if (bag[key]?.length === 0) delete bag[key];
  }
  return bag;
}
function assemble(sections: Section[]): string {
  let txt = "";
  for (const s of sections) {
    txt += `**${s.title}**\n`;
    for (const b of s.bullets) txt += `• ${b}\n`;
    txt += `\n`;
    if (txt.length > MAX_SUMMARY_CHARS) break;
  }
  return txt.trim();
}
export function summarizeMedicalDoc(text: string): string {
  if (!text || text.length < 200) return "Short document. No extended summary necessary.";
  const lines = getLines(text);
  const header = extractHeader(text);
  const highlights = pickHighlights(lines);
  const grouped = groupBySystem(lines);
  const sections: Section[] = [];
  sections.push({ title:"What this document is", bullets:[
    `${header.title}${header.date ? ` — ${header.date}` : ""}`,
    "OCR-extracted content; formatting normalized.",
  ]});
  if (highlights.length) sections.push({ title:"Key results & flags", bullets: highlights });
  for (const k of Object.keys(grouped)) sections.push({ title: `${k} panel`, bullets: grouped[k] });
  sections.push({ title:"Notes & follow-up (generic)", bullets:[
    "Compare against your lab’s reference ranges; trends matter.",
    "Discuss abnormal or borderline results with your clinician.",
    "If results conflict with symptoms, consider repeat testing.",
  ]});
  return assemble(sections);
}
