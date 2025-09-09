export type ThyroidRuleOut = {
  steps: string[];
  nudges: string[];
  fired: string[];
  softAlerts: string[];
};

type Lab = {
  name: string;
  value?: number | string;
  unit?: string;
  normalLow?: number | null;
  normalHigh?: number | null;
  takenAt?: string | Date | null;
};

function parseNumber(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickLab(allLabs: Lab[] = [], keys: string[]): Lab | undefined {
  const needle = keys.map((k) => k.toLowerCase());
  return allLabs.find((l) => {
    const n = (l?.name || "").toLowerCase();
    return needle.some((k) => n.includes(k));
  });
}

// Basic interpretation thresholds (fallbacks if no reference ranges given)
const REF = {
  TSH: { low: 0.4, high: 4.5 },       // mIU/L
  FT4: { low: 0.8, high: 1.8 },       // ng/dL (typical US units)
  T3:  { low: 80,  high: 200 },       // ng/dL (total T3, typical)
};

export function thyroidRules(input: any): ThyroidRuleOut {
  const out: ThyroidRuleOut = { steps: [], nudges: [], fired: [], softAlerts: [] };
  const labs: Lab[] =
    (input?.labs as Lab[]) ??
    (input?.profile?.labs as Lab[]) ??
    [];

  // try to pick TSH/FT4/T3 from labs
  const tshLab = pickLab(labs, ["tsh"]);
  const ft4Lab = pickLab(labs, ["free t4", "ft4"]);
  const t3Lab  = pickLab(labs, ["t3", "total t3", "free t3", "ft3"]);

  const tsh = parseNumber(tshLab?.value);
  const ft4 = parseNumber(ft4Lab?.value);
  const t3  = parseNumber(t3Lab?.value);

  // Resolve dynamic reference ranges if provided by lab; otherwise fallback to REF
  const tshLow  = tshLab?.normalLow  ?? REF.TSH.low;
  const tshHigh = tshLab?.normalHigh ?? REF.TSH.high;
  const ft4Low  = ft4Lab?.normalLow  ?? REF.FT4.low;
  const ft4High = ft4Lab?.normalHigh ?? REF.FT4.high;
  const t3Low   = t3Lab?.normalLow   ?? REF.T3.low;
  const t3High  = t3Lab?.normalHigh  ?? REF.T3.high;

  // Pregnancy signal if your profile stores it anywhere reasonably guessable
  const pregnant: boolean =
    Boolean(input?.profile?.pregnant) ||
    /pregnan/i.test(String(input?.profile?.notes || "")) ||
    false;

  // Helper flags
  const ft4LowFlag  = ft4 !== null && ft4 < ft4Low;
  const ft4HighFlag = ft4 !== null && ft4 > ft4High;
  const t3HighFlag  = t3  !== null && t3  > t3High;

  // --- Classification (simplified, conservative) ---
  // Overt hypothyroidism: TSH >= 10 OR TSH high with low FT4
  if ((tsh !== null && tsh >= 10) || (tsh !== null && tsh > tshHigh && ft4LowFlag)) {
    out.fired.push("thyroid.overt_hypothyroid");
    out.steps.push(
      "Overt hypothyroidism suspected based on labs (high TSH and/or low FT4).",
      "Review symptoms (fatigue, weight gain, cold intolerance, constipation).",
      "Check thyroid peroxidase (TPO) antibodies if not done.",
    );
    if (pregnant) {
      out.steps.push("Pregnancy: urgent endocrinology/obstetrics coordination is recommended.");
      out.softAlerts.push("Pregnancy with abnormal thyroid function → seek prompt specialist care.");
    }
    out.nudges.push(
      "If therapy is started/adjusted, repeat TSH (±FT4) in 6–8 weeks to titrate.",
    );
  }
  // Subclinical hypothyroidism: TSH 4.5–10 with normal FT4
  else if (tsh !== null && tsh > tshHigh && tsh < 10 && !ft4LowFlag) {
    out.fired.push("thyroid.subclinical_hypothyroid");
    out.steps.push(
      "Subclinical hypothyroidism pattern (TSH mildly elevated, FT4 normal).",
      "Recheck TSH (±TPO antibodies) in 6–8 weeks to confirm persistence.",
    );
    if (pregnant) {
      out.steps.push("Pregnancy: lower TSH targets apply; seek obstetric/endocrine guidance.");
    }
    out.nudges.push("Review symptoms and cardiovascular risk before decisions.");
  }
  // Overt hyperthyroidism: TSH < 0.1 with high FT4 or high T3
  else if (tsh !== null && tsh < 0.1 && (ft4HighFlag || t3HighFlag)) {
    out.fired.push("thyroid.overt_hyperthyroid");
    out.steps.push(
      "Overt hyperthyroidism suspected (suppressed TSH with high FT4/T3).",
      "Assess symptoms (palpitations, tremor, heat intolerance, weight loss).",
      "Consider thyroid receptor antibodies (TRAb) / TSI and thyroid uptake/scan per local practice.",
    );
    out.nudges.push(
      "If treatment is initiated, repeat FT4/TSH in ~4–6 weeks for response.",
    );
    if (pregnant) {
      out.steps.push("Pregnancy: coordinate urgently with obstetrics/endocrinology; some therapies are contraindicated.");
      out.softAlerts.push("Pregnancy with suspected hyperthyroidism → urgent specialist input.");
    }
  }
  // Subclinical hyperthyroidism: TSH 0.1–0.4 with normal FT4/T3
  else if (tsh !== null && tsh >= 0.1 && tsh < 0.4 && !ft4HighFlag && !t3HighFlag) {
    out.fired.push("thyroid.subclinical_hyperthyroid");
    out.steps.push(
      "Subclinical hyperthyroidism pattern (TSH mildly suppressed, FT4/T3 normal).",
      "Recheck thyroid panel in 6–8 weeks to confirm persistence.",
    );
    out.nudges.push("Ask about palpitations, bone loss risk, and atrial fibrillation history.");
  }

  // Generic suggestions if thyroid pattern was detected at all
  if (out.fired.length) {
    out.nudges.push(
      "Keep lab units consistent (FT4 often in ng/dL).",
      "Avoid changing doses based on a single value; confirm with repeat testing.",
    );
  }

  return out;
}

