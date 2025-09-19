export type CanonicalDirection = "lower" | "higher" | null;

export type CanonicalLab = {
  code: string;
  name: string;
  better: CanonicalDirection;
  kinds: string[];
  keywords?: string[];
};

export const CANONICAL_LABS: CanonicalLab[] = [
  {
    code: "LDL-C",
    name: "LDL Cholesterol",
    better: "lower",
    kinds: ["ldl", "ldl_cholesterol"],
    keywords: ["ldl", "ldl cholesterol", "bad cholesterol"],
  },
  {
    code: "HDL-C",
    name: "HDL Cholesterol",
    better: "higher",
    kinds: ["hdl", "hdl_cholesterol"],
    keywords: ["hdl", "hdl cholesterol", "good cholesterol"],
  },
  {
    code: "TG",
    name: "Triglycerides",
    better: "lower",
    kinds: ["triglycerides", "tg"],
  },
  {
    code: "TC",
    name: "Total Cholesterol",
    better: "lower",
    kinds: ["total_cholesterol", "cholesterol", "cholesterol_total"],
    keywords: ["total cholesterol", "cholesterol"],
  },
  {
    code: "HBA1C",
    name: "HbA1c",
    better: "lower",
    kinds: ["hba1c"],
    keywords: ["a1c", "hb a1c", "hba1c"],
  },
  {
    code: "FBG",
    name: "Fasting Glucose",
    better: "lower",
    kinds: ["blood_sugar_fasting", "fbg"],
    keywords: ["fasting glucose", "fasting sugar", "fbg"],
  },
  {
    code: "CRP",
    name: "C-reactive protein",
    better: "lower",
    kinds: ["crp", "c_reactive_protein"],
  },
  {
    code: "ESR",
    name: "ESR",
    better: "lower",
    kinds: ["esr"],
  },
  {
    code: "ALT",
    name: "ALT (SGPT)",
    better: "lower",
    kinds: ["sgpt", "alt"],
    keywords: ["sgpt", "alt"],
  },
  {
    code: "AST",
    name: "AST (SGOT)",
    better: "lower",
    kinds: ["sgot", "ast"],
    keywords: ["sgot", "ast"],
  },
  {
    code: "GGT",
    name: "GGT",
    better: "lower",
    kinds: ["ggt"],
  },
  {
    code: "ALP",
    name: "ALP",
    better: "lower",
    kinds: ["alkaline_phosphatase", "alp"],
    keywords: ["alkaline phosphatase", "alp"],
  },
  {
    code: "CREAT",
    name: "Creatinine",
    better: "lower",
    kinds: ["creatinine"],
  },
  {
    code: "EGFR",
    name: "eGFR",
    better: "higher",
    kinds: ["egfr"],
  },
  {
    code: "UREA",
    name: "Urea",
    better: "lower",
    kinds: ["urea"],
  },
  {
    code: "VITD",
    name: "Vitamin D (25-OH)",
    better: "higher",
    kinds: ["vitamin_d", "vitamin_d_25_oh", "vitd", "25_oh_vitamin_d"],
    keywords: ["vitamin d", "vit d"],
  },
  {
    code: "UIBC",
    name: "UIBC",
    better: null,
    kinds: ["uibc", "unsaturated_iron_binding_capacity"],
  },
  {
    code: "TIBC",
    name: "TIBC",
    better: null,
    kinds: ["tibc"],
  },
  {
    code: "FERRITIN",
    name: "Ferritin",
    better: null,
    kinds: ["ferritin"],
  },
];

const KIND_TO_CANONICAL = new Map<string, CanonicalLab>();
const CODE_TO_CANONICAL = new Map<string, CanonicalLab>();

for (const lab of CANONICAL_LABS) {
  CODE_TO_CANONICAL.set(lab.code, lab);
  for (const raw of lab.kinds) {
    KIND_TO_CANONICAL.set(raw.toLowerCase(), lab);
  }
  if (lab.keywords) {
    for (const keyword of lab.keywords) {
      KIND_TO_CANONICAL.set(keyword.toLowerCase(), lab);
    }
  }
  KIND_TO_CANONICAL.set(lab.code.toLowerCase(), lab);
  KIND_TO_CANONICAL.set(lab.name.toLowerCase(), lab);
}

export function canonicalForKind(kind?: string | null): CanonicalLab | undefined {
  if (!kind) return undefined;
  return KIND_TO_CANONICAL.get(kind.toLowerCase());
}

export function canonicalForCode(code?: string | null): CanonicalLab | undefined {
  if (!code) return undefined;
  return CODE_TO_CANONICAL.get(code.toUpperCase());
}

export function listAllKinds(): string[] {
  const seen = new Set<string>();
  CANONICAL_LABS.forEach(lab => {
    lab.kinds.forEach(kind => seen.add(kind));
  });
  return Array.from(seen);
}

export const LABS_INTENT_REGEX =
  /(report|reports|observation|observations|blood|lab|labs|lipid|cholesterol|ldl|hdl|triglycerides|a1c|hba1c|vitamin\s*d|crp|esr|uibc|tibc|ferritin|creatinine|egfr|urea|bilirubin|ast|alt|sgot|sgpt|ggt|alkaline|alp|lft|kft|kidney|liver|date\s*wise|datewise|trend|changes?)/i;

export const RAW_TEXT_REGEX = /(raw text|full text|show the report text)/i;

export function detectLabsInText(text: string): string[] {
  const lowered = text.toLowerCase();
  const found = new Set<string>();

  for (const lab of CANONICAL_LABS) {
    const haystack = [lab.code, lab.name, ...lab.kinds, ...(lab.keywords ?? [])];
    if (haystack.some(keyword => lowered.includes(keyword.toLowerCase()))) {
      found.add(lab.code);
    }
  }

  if (/lipid|lipids/.test(lowered) || /cholesterol/.test(lowered)) {
    ["LDL-C", "HDL-C", "TG", "TC"].forEach(code => found.add(code));
  }
  if (/lft|liver function/i.test(text) || /liver/.test(lowered)) {
    ["ALT", "AST", "GGT", "ALP"].forEach(code => found.add(code));
  }
  if (/kft|kidney/.test(lowered)) {
    ["CREAT", "EGFR", "UREA"].forEach(code => found.add(code));
  }

  return Array.from(found);
}

