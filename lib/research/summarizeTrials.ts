import type { Trial } from "@/lib/trials/search";

// Lightweight vocab (extend anytime)
const BIOMARKERS = [
  "EGFR","ALK","KRAS","NRAS","BRAF","HER2","ERBB2","PIK3CA","ROS1","RET",
  "NTRK","MET","PD-L1","PD1","BRCA1","BRCA2","CD19","CD20","CD22","CD33",
  "FLT3","IDH1","IDH2","PTEN","TP53","JAK2","KIT","CDK4","CDK6","VEGF","VEGFA"
];

const CONDITIONS = [
  "melanoma","lung cancer","nsclc","sclc","breast cancer","colon cancer",
  "colorectal","glioma","glioblastoma","leukemia","aml","cll","myeloma",
  "lymphoma","prostate cancer","ovarian cancer","pancreatic cancer",
  "gastric cancer","hepatic","liver cancer","renal cell carcinoma","rcc",
  "myelodysplastic","mcl","mm","sarcoma","thyroid cancer","endometrial",
];

type CountMap = Record<string, number>;
const topN = (m: CountMap, n = 3) =>
  Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);

function scan(trials: Trial[]) {
  const byPhase: CountMap = {};
  const byStatus: CountMap = {};
  const byCountry: CountMap = {};
  const genes: CountMap = {};
  const conditions: CountMap = {};

  for (const t of trials) {
    if (t.phase) byPhase[t.phase] = (byPhase[t.phase] || 0) + 1;
    if (t.status) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.country) byCountry[t.country] = (byCountry[t.country] || 0) + 1;

    const title = (t.title || "").toLowerCase();

    for (const g of BIOMARKERS) {
      if (title.includes(g.toLowerCase())) genes[g] = (genes[g] || 0) + 1;
    }
    for (const c of CONDITIONS) {
      if (title.includes(c)) conditions[c] = (conditions[c] || 0) + 1;
    }
  }
  return { byPhase, byStatus, byCountry, genes, conditions };
}

export function summarizeTrials(trials: Trial[], mode: "patient" | "doctor"): string {
  if (!trials.length) return "No trials found for the selected filters.";

  const { byPhase, byStatus, byCountry, genes, conditions } = scan(trials);
  const total = trials.length;

  const phaseStr = topN(byPhase).map(([p,c]) => `${c}× Phase ${p}`).join(", ") || "N/A";
  const statusStr = topN(byStatus).map(([s,c]) => `${c}× ${s}`).join(", ") || "N/A";
  const countryStr = topN(byCountry).map(([c,cnt]) => `${c} (${cnt})`).join(", ") || "N/A";
  const geneStr = topN(genes).map(([g,c]) => `${g} (${c})`).join(", ");
  const condStr = topN(conditions).map(([k,c]) => `${k} (${c})`).join(", ");
  const bySource: Record<string, number> = {};
  for (const t of trials) if (t.source) bySource[t.source] = (bySource[t.source] || 0) + 1;
  const sourceStr = Object.entries(bySource).map(([s,c]) => `${c}× ${s}`).join(", ");

  if (mode === "patient") {
    const mainPhase = topN(byPhase)[0]?.[0];
    const mainStatus = topN(byStatus)[0]?.[0];
    const mainCountry = topN(byCountry)[0]?.[0];

    const bits: string[] = [];
    bits.push(`We found ${total} trials.`);
    if (mainPhase) bits.push(`Most are in Phase ${mainPhase}.`);
    if (mainStatus) bits.push(`${mainStatus} is the most common status.`);
    if (mainCountry) bits.push(`Many are in ${mainCountry}.`);
    if (condStr) bits.push(`Common focus: ${condStr.split(", ")[0].replace(/\s\(\d+\)$/,"")}.`);
    return bits.join(" ");
  }

  // doctor
  const lines = [
    `${total} trials retrieved.`,
    `Phases: ${phaseStr}.`,
    `Statuses: ${statusStr}.`,
    `Top countries: ${countryStr}.`,
  ];
  if (sourceStr) lines.push(`Sources: ${sourceStr}.`);
  if (geneStr) lines.push(`Frequent molecular targets: ${geneStr}.`);
  if (condStr) lines.push(`Conditions represented: ${condStr}.`);
  return lines.join(" ");
}
