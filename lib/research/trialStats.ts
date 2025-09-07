import type { Trial } from "@/lib/trials/search";

type CountMap = Record<string, number>;
const topN = (m: CountMap, n = 5) =>
  Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);

const BIOMARKERS = [
  "EGFR","ALK","KRAS","NRAS","BRAF","HER2","ERBB2","PIK3CA","ROS1","RET",
  "NTRK","MET","PD-L1","PD1","BRCA1","BRCA2","CD19","CD20","CD22","CD33",
  "FLT3","IDH1","IDH2","PTEN","TP53","JAK2","KIT","CDK4","CDK6","VEGF","VEGFA",
];

const CONDITIONS = [
  "melanoma","lung cancer","nsclc","sclc","breast cancer","colon cancer","colorectal",
  "glioma","glioblastoma","leukemia","aml","cll","myeloma","lymphoma","prostate cancer",
  "ovarian cancer","pancreatic cancer","gastric cancer","hepatic","liver cancer",
  "renal cell carcinoma","rcc","myelodysplastic","mcl","mm","sarcoma","thyroid cancer",
  "endometrial",
];

export type TrialStats = {
  total: number;
  byPhase: CountMap;
  byStatus: CountMap;
  byCountry: CountMap;
  genesTop: Array<[string, number]>;
  conditionsTop: Array<[string, number]>;
  recruitingCount: number;
};

export function computeTrialStats(trials: Trial[]): TrialStats {
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

  const recruitingCount = byStatus["Recruiting"] || 0;

  return {
    total: trials.length,
    byPhase,
    byStatus,
    byCountry,
    genesTop: topN(genes, 5),
    conditionsTop: topN(conditions, 5),
    recruitingCount,
  };
}

