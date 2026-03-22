/**
 * Health Score Computation Engine
 * Composite 0-100 score from: labs (25%), vitals (25%), activity (20%), adherence (20%), mental (10%)
 */

export type SubScores = {
  labs: number | null;
  vitals: number | null;
  activity: number | null;
  adherence: number | null;
  mental: number | null;
};

export type HealthFactor = {
  name: string;
  value: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
};

export type HealthScoreResult = {
  overall: number;
  sub: SubScores;
  factors: HealthFactor[];
  recommendations: string[];
  delta: number | null;
  streakDays: number;
};

const WEIGHTS = { labs: 0.25, vitals: 0.25, activity: 0.20, adherence: 0.20, mental: 0.10 };

// --- Labs scoring ---
function scoreInRange(value: number, low: number, high: number, dangerLow?: number, dangerHigh?: number): number {
  if (value >= low && value <= high) return 100;
  const dist = value < low ? (low - value) / low : (value - high) / high;
  if (dangerLow !== undefined && value < dangerLow) return 10;
  if (dangerHigh !== undefined && value > dangerHigh) return 10;
  if (dist < 0.15) return 70;
  if (dist < 0.30) return 40;
  return 20;
}

export function scoreHba1c(v: number): { score: number; factor: HealthFactor } {
  let score = 100;
  if (v >= 8.5) score = 20;
  else if (v >= 7.0) score = 40;
  else if (v >= 6.5) score = 60;
  else if (v >= 5.7) score = 80;
  return {
    score,
    factor: {
      name: "HbA1c",
      value: `${v}%`,
      impact: score >= 80 ? "positive" : score >= 60 ? "neutral" : "negative",
      detail: score >= 80 ? "Well controlled" : score >= 60 ? "Pre-diabetic range" : "Needs attention",
    },
  };
}

export function scoreLdl(v: number): { score: number; factor: HealthFactor } {
  let score = 100;
  if (v >= 190) score = 20;
  else if (v >= 160) score = 40;
  else if (v >= 130) score = 60;
  else if (v >= 100) score = 80;
  return {
    score,
    factor: { name: "LDL cholesterol", value: `${v} mg/dL`, impact: score >= 80 ? "positive" : score >= 60 ? "neutral" : "negative", detail: score >= 80 ? "Optimal" : "Elevated" },
  };
}

export function scoreEgfr(v: number): { score: number; factor: HealthFactor } {
  let score = 100;
  if (v < 15) score = 10;
  else if (v < 30) score = 30;
  else if (v < 60) score = 50;
  else if (v < 90) score = 75;
  return {
    score,
    factor: { name: "eGFR", value: `${v} mL/min`, impact: score >= 75 ? "positive" : score >= 50 ? "neutral" : "negative", detail: score >= 75 ? "Normal kidney function" : "Reduced kidney function" },
  };
}

export function scoreBmi(v: number): { score: number; factor: HealthFactor } {
  let score = 100;
  if (v < 16 || v > 40) score = 20;
  else if (v < 18.5 || v > 35) score = 40;
  else if (v < 18.5 || v > 30) score = 60;
  else if (v > 25) score = 80;
  return {
    score,
    factor: { name: "BMI", value: v.toFixed(1), impact: score >= 80 ? "positive" : score >= 60 ? "neutral" : "negative", detail: score >= 80 ? "Healthy range" : "Outside optimal range" },
  };
}

// --- Vitals scoring ---
export function scoreBp(sys: number, dia: number): { score: number; factor: HealthFactor } {
  let score = 100;
  if (sys >= 180 || dia >= 120) score = 10;
  else if (sys >= 140 || dia >= 90) score = 40;
  else if (sys >= 130 || dia >= 80) score = 70;
  else if (sys < 90 || dia < 60) score = 50;
  return {
    score,
    factor: { name: "Blood pressure", value: `${sys}/${dia} mmHg`, impact: score >= 80 ? "positive" : score >= 60 ? "neutral" : "negative", detail: score >= 80 ? "Normal" : score >= 60 ? "Elevated" : "High" },
  };
}

export function scoreHr(v: number): number {
  if (v >= 60 && v <= 100) return 100;
  if (v >= 50 && v <= 110) return 70;
  return 40;
}

export function scoreSpo2(v: number): number {
  if (v >= 95) return 100;
  if (v >= 90) return 60;
  return 20;
}

// --- Activity scoring ---
export function scoreSteps(v: number): number {
  if (v >= 10000) return 100;
  if (v >= 7500) return 80;
  if (v >= 5000) return 60;
  if (v >= 2500) return 40;
  return 20;
}

export function scoreSleep(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours <= 10) return 70;
  return 40;
}

// --- Adherence scoring ---
export function scoreAdherence(taken: number, total: number): number {
  if (total === 0) return 100; // no meds = perfect adherence
  const pct = taken / total;
  if (pct >= 1.0) return 100;
  if (pct >= 0.9) return 90;
  if (pct >= 0.8) return 75;
  if (pct >= 0.5) return 50;
  return 20;
}

// --- Mental scoring ---
export function scoreMood(mood: number): number {
  // mood: 1-5 scale
  return Math.max(20, mood * 20);
}

// --- Composite ---
export function computeOverall(sub: SubScores): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = sub[key as keyof SubScores];
    if (val !== null && val !== undefined) {
      weightedSum += val * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 50; // no data = neutral score
  return Math.round(weightedSum / totalWeight);
}

export function generateRecommendations(sub: SubScores, factors: HealthFactor[]): string[] {
  const recs: string[] = [];
  const neg = factors.filter((f) => f.impact === "negative");

  if (sub.activity !== null && sub.activity < 60) {
    recs.push("Try adding a 20-minute walk to your daily routine to boost your activity score.");
  }
  if (sub.adherence !== null && sub.adherence < 80) {
    recs.push("Setting medication reminders can help improve your adherence score.");
  }
  if (sub.mental !== null && sub.mental < 60) {
    recs.push("Consider a short mindfulness or breathing exercise today.");
  }
  if (sub.labs !== null && sub.labs < 60) {
    recs.push("Some lab values are outside optimal range. Consider discussing with your doctor.");
  }
  if (sub.vitals !== null && sub.vitals < 60) {
    recs.push("Your vital signs need attention. Monitor regularly and consult your clinician.");
  }
  if (recs.length === 0) {
    recs.push("Great job! Keep maintaining your healthy habits.");
  }
  return recs.slice(0, 3);
}
