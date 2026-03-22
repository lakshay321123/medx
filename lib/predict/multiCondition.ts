export type ConditionRisk = {
  condition: string;
  riskScore: number;
  band: "Low" | "Moderate" | "High" | "Critical";
  factors: { name: string; contribution: number; direction: "risk" | "protective" }[];
  recommendations: string[];
};

function band(score: number): "Low" | "Moderate" | "High" | "Critical" {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

type Bio = Record<string, number | undefined>;

export function scoreCardiovascularRisk(bio: Bio, age?: number, sex?: string, smoking?: boolean): ConditionRisk {
  let score = 0;
  const factors: ConditionRisk["factors"] = [];
  const ldl = bio["LDL-C"] || bio["LDL"];
  if (ldl !== undefined) {
    if (ldl >= 190) { score += 25; factors.push({ name: "LDL >= 190", contribution: 25, direction: "risk" }); }
    else if (ldl >= 160) { score += 15; factors.push({ name: "LDL 160-189", contribution: 15, direction: "risk" }); }
    else if (ldl >= 130) { score += 8; factors.push({ name: "LDL 130-159", contribution: 8, direction: "risk" }); }
  }
  const hdl = bio["HDL-C"] || bio["HDL"];
  if (hdl !== undefined && hdl < 40) { score += 15; factors.push({ name: "HDL < 40", contribution: 15, direction: "risk" }); }
  const sbp = bio["SBP"];
  if (sbp !== undefined) {
    if (sbp >= 180) { score += 25; factors.push({ name: "SBP >= 180", contribution: 25, direction: "risk" }); }
    else if (sbp >= 140) { score += 15; factors.push({ name: "SBP 140-179", contribution: 15, direction: "risk" }); }
  }
  if (age !== undefined && age >= 55) { score += 10; factors.push({ name: "Age >= 55", contribution: 10, direction: "risk" }); }
  if (smoking) { score += 15; factors.push({ name: "Smoker", contribution: 15, direction: "risk" }); }
  const recs: string[] = [];
  if (ldl && ldl >= 130) recs.push("Discuss statin therapy with your doctor.");
  if (smoking) recs.push("Smoking cessation is the single most impactful step.");
  if (!recs.length) recs.push("Maintain heart-healthy habits.");
  return { condition: "Cardiovascular Disease", riskScore: Math.min(100, score), band: band(Math.min(100, score)), factors, recommendations: recs };
}

export function scoreKidneyRisk(bio: Bio, age?: number): ConditionRisk {
  let score = 0;
  const factors: ConditionRisk["factors"] = [];
  const egfr = bio["EGFR"] || bio["eGFR"];
  if (egfr !== undefined) {
    if (egfr < 15) { score += 40; factors.push({ name: "eGFR < 15 (Stage 5)", contribution: 40, direction: "risk" }); }
    else if (egfr < 30) { score += 30; factors.push({ name: "eGFR 15-29 (Stage 4)", contribution: 30, direction: "risk" }); }
    else if (egfr < 60) { score += 20; factors.push({ name: "eGFR 30-59 (Stage 3)", contribution: 20, direction: "risk" }); }
  }
  const hba1c = bio["HBA1C"];
  if (hba1c !== undefined && hba1c >= 7.0) { score += 15; factors.push({ name: "HbA1c >= 7%", contribution: 15, direction: "risk" }); }
  const sbp = bio["SBP"];
  if (sbp !== undefined && sbp >= 140) { score += 15; factors.push({ name: "Hypertension", contribution: 15, direction: "risk" }); }
  const recs = [];
  if (egfr !== undefined && egfr < 60) recs.push("Schedule a nephrology consult.");
  if (!recs.length) recs.push("Monitor kidney function annually.");
  return { condition: "Chronic Kidney Disease", riskScore: Math.min(100, score), band: band(Math.min(100, score)), factors, recommendations: recs };
}

export function scoreMetabolicRisk(bio: Bio, bmi?: number, smoking?: boolean): ConditionRisk {
  let score = 0;
  const factors: ConditionRisk["factors"] = [];
  const hba1c = bio["HBA1C"];
  if (hba1c !== undefined) {
    if (hba1c >= 8.5) { score += 30; factors.push({ name: "HbA1c >= 8.5%", contribution: 30, direction: "risk" }); }
    else if (hba1c >= 6.5) { score += 20; factors.push({ name: "HbA1c 6.5-8.4%", contribution: 20, direction: "risk" }); }
    else if (hba1c >= 5.7) { score += 10; factors.push({ name: "HbA1c 5.7-6.4%", contribution: 10, direction: "risk" }); }
  }
  if (bmi !== undefined) {
    if (bmi >= 35) { score += 20; factors.push({ name: "BMI >= 35", contribution: 20, direction: "risk" }); }
    else if (bmi >= 30) { score += 15; factors.push({ name: "BMI 30-34.9", contribution: 15, direction: "risk" }); }
  }
  if (smoking) { score += 10; factors.push({ name: "Smoker", contribution: 10, direction: "risk" }); }
  const recs = [];
  if (bmi && bmi >= 30) recs.push("5-7% weight loss significantly reduces metabolic risk.");
  if (!recs.length) recs.push("Continue healthy lifestyle habits.");
  return { condition: "Metabolic / Diabetes", riskScore: Math.min(100, score), band: band(Math.min(100, score)), factors, recommendations: recs };
}

export function computeAllRisks(bio: Bio, opts: { age?: number; sex?: string; bmi?: number; smoking?: boolean } = {}): ConditionRisk[] {
  return [
    scoreCardiovascularRisk(bio, opts.age, opts.sex, opts.smoking),
    scoreKidneyRisk(bio, opts.age),
    scoreMetabolicRisk(bio, opts.bmi, opts.smoking),
  ].sort((a, b) => b.riskScore - a.riskScore);
}
