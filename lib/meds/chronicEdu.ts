export interface ChronicMedEntry {
  name: string;
  purpose: string;
  cautions: string[];
  references: string[];
}

const BRAND_TO_GENERIC: Record<string, string> = {
  glucophage: "metformin",
  zestril: "lisinopril",
  synthroid: "levothyroxine",
};

const DATA: Record<string, ChronicMedEntry> = {
  metformin: {
    name: "Metformin",
    purpose: "Lowers liver glucose output",
    cautions: ["GI upset", "avoid if severe kidney disease"],
    references: ["https://www.nhs.uk/medicines/metformin/"]
  },
  lisinopril: {
    name: "Lisinopril",
    purpose: "ACE inhibitor to lower blood pressure",
    cautions: ["may cause cough", "monitor potassium levels"],
    references: ["https://www.nhs.uk/medicines/lisinopril/"]
  },
  levothyroxine: {
    name: "Levothyroxine",
    purpose: "Replaces thyroid hormone",
    cautions: ["take on empty stomach", "overdose may cause palpitations"],
    references: ["https://www.nhs.uk/medicines/levothyroxine/"]
  },
  amlodipine: {
    name: "Amlodipine",
    purpose: "Calcium-channel blocker for hypertension",
    cautions: ["ankle swelling", "dizziness"],
    references: ["https://www.nhs.uk/medicines/amlodipine/"]
  }
};

function normalize(name: string): string | null {
  const lower = name.trim().toLowerCase();
  const generic = BRAND_TO_GENERIC[lower] || lower;
  return DATA[generic] ? generic : null;
}

export function chronicMedEducation(names: string[]) {
  const results: ChronicMedEntry[] = [];
  const unrecognized: string[] = [];
  const seen = new Set<string>();
  let successes = 0;

  for (const n of names) {
    const key = normalize(n);
    if (!key) {
      unrecognized.push(n);
      continue;
    }
    successes++;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(DATA[key]);
  }

  console.log("chronicMedEdu_norm_rate", { total: names.length, normalized: successes });

  return {
    chronicMeds: results,
    unrecognized,
    interactionWarning: "Medication interactions can be complex; ask your clinician about interactions.",
  };
}

export const CHRONIC_MED_EDU_ENABLED = (process.env.CHRONIC_MED_EDU || "").toLowerCase() === "true";
