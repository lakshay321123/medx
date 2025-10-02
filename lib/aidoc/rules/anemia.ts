export type AnemiaRuleOut = {
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

// Rough anemia thresholds (adult, generic; local refs vary)
const REF = {
  Hb: { low: 12 }, // g/dL
  MCV: { low: 80, high: 100 }, // fL
};

export function anemiaRules(input: any): AnemiaRuleOut {
  const out: AnemiaRuleOut = { steps: [], nudges: [], fired: [], softAlerts: [] };
  const labs: Lab[] =
    (input?.labs as Lab[]) ??
    (input?.profile?.labs as Lab[]) ??
    [];

  const hbLab = pickLab(labs, ["hb", "hemoglobin"]);
  const mcvLab = pickLab(labs, ["mcv"]);
  const ferritinLab = pickLab(labs, ["ferritin"]);
  const b12Lab = pickLab(labs, ["b12", "vitamin b12"]);
  const folateLab = pickLab(labs, ["folate"]);

  const hb = parseNumber(hbLab?.value);
  const mcv = parseNumber(mcvLab?.value);
  const ferritin = parseNumber(ferritinLab?.value);
  const b12 = parseNumber(b12Lab?.value);
  const folate = parseNumber(folateLab?.value);

  if (hb !== null && hb < REF.Hb.low) {
    out.fired.push("anemia.present");
    out.steps.push(
      `Anemia detected (Hb ${hbLab?.value}${hbLab?.unit || "g/dL"}).`,
      "Assess clinical symptoms: fatigue, pallor, dyspnea, chest pain.",
    );

    // Microcytic
    if (mcv !== null && mcv < REF.MCV.low) {
      out.fired.push("anemia.microcytic");
      out.steps.push("Microcytic anemia pattern (MCV < 80 fL).");
      if (ferritin !== null && ferritin < 15) {
        out.steps.push("Low ferritin: iron deficiency anemia likely.");
        out.nudges.push("Evaluate diet, bleeding sources (GI losses, menstruation).");
      } else {
        out.nudges.push("Consider thalassemia trait or chronic disease if ferritin normal/high.");
      }
    }

    // Macrocytic
    else if (mcv !== null && mcv > REF.MCV.high) {
      out.fired.push("anemia.macrocytic");
      out.steps.push("Macrocytic anemia pattern (MCV > 100 fL).");
      if (b12 !== null && b12 < 200) {
        out.steps.push("Low B12 suggests B12 deficiency anemia.");
        out.nudges.push("Check for pernicious anemia, malabsorption, diet issues.");
      }
      if (folate !== null && folate < 3) {
        out.steps.push("Low folate suggests folate deficiency anemia.");
        out.nudges.push("Assess diet, alcohol use, medications (e.g. methotrexate).");
      }
    }

    // Normocytic
    else {
      out.fired.push("anemia.normocytic");
      out.steps.push("Normocytic anemia pattern.");
      out.nudges.push("Consider chronic disease, renal function, acute blood loss.");
    }

    // Soft alert for very low Hb
    if (hb < 8) {
      out.softAlerts ||= [];
      out.softAlerts.push("Severe anemia (Hb < 8 g/dL) → urgent evaluation/transfusion consideration.");
    }
  }

  return out;
}

