import { codeForDx, codeForLab, codeForDrug } from "@/lib/clinical/codes";

type Patient = {
  name?: string;
  age?: string | number;
  sex?: string;
  encounterDate?: string;
  diagnoses?: string[];
  comorbidities?: string[];
  meds?: string[];
  labs?: Array<{ name: string; value: string | number; unit?: string }>;
  allergies?: string[];
};

export function renderDoctorHeader(p: Patient) {
  return (
`**Patient Demographics**
- **Name:** ${p.name || "Unknown"}
- **Age:** ${p.age ?? "—"}
- **Sex:** ${p.sex ?? "—"}
- **Encounter Date:** ${p.encounterDate ?? "—"}`
  );
}

export function renderDiagnoses(dxs: string[] = []) {
  if (!dxs.length) return "**Diagnoses**\n- Not specified";
  const lines = dxs.map(d => {
    const c = codeForDx(d);
    const parts = [`- ${titleCase(d)}`];
    if (c.icd10) parts.push(`ICD-10: *${c.icd10}*`);
    if (c.snomed) parts.push(`SNOMED: *${c.snomed}*`);
    return parts.join(" — ");
  });
  return `**Diagnoses**\n${lines.join("\n")}`;
}

export function renderComorbidities(cmb: string[] = []) {
  if (!cmb.length) return "**Comorbidities**\n- None listed";
  return `**Comorbidities**\n${cmb.map(x => `- ${titleCase(x)}`).join("\n")}`;
}

export function renderMeds(meds: string[] = []) {
  if (!meds.length) return "**Medications**\n- None documented";
  const lines = meds.map(m => {
    const atc = codeForDrug(m);
    return atc ? `- ${titleCase(m)} — ATC: *${atc}*` : `- ${titleCase(m)}`;
  });
  return `**Medications**\n${lines.join("\n")}`;
}

export function renderLabs(labs: Patient["labs"] = []) {
  if (!labs.length) return "**Labs/Imaging**\n- No labs provided";
  const rows = labs.map(l => {
    const meta = codeForLab(l.name);
    const code = meta ? `LOINC: *${meta.code}*` : "";
    const norm = meta?.ref ? ` (ref: ${meta.ref})` : "";
    const unit = l.unit || meta?.unit || "";
    return `- ${titleCase(l.name)} — ${l.value}${unit ? " " + unit : ""} ${code}${norm}`;
  });
  return `**Labs & Imaging**\n${rows.join("\n")}`;
}

export function renderDoctorBody() {
  return (
`**Clinical Implications**
- Explain how comorbidities and lab abnormalities impact management (renal/hepatic/pulmonary constraints).
- Note any contraindications or necessary dose adjustments.

**Management Options**
- Standard of care tailored to organ function and comorbidities.
- Contraindicated therapies with reasoning.
- Monitoring plan.

**Supportive / Palliative Measures**
- Symptom control, transfusions, infection prophylaxis.
- Asthma optimization / inhaler technique if relevant.
- Early palliative integration when appropriate.

**Red Flags**
- Labs or signs that require urgent escalation (e.g., neutropenic fever, rising creatinine, acute bleed).`
  );
}

export function renderDoctorSummary(p: Patient): string {
  const blocks = [
    renderDoctorHeader(p),
    renderDiagnoses(p.diagnoses),
    renderComorbidities(p.comorbidities),
    renderMeds(p.meds),
    renderLabs(p.labs),
    renderDoctorBody(),
  ];
  return blocks.join("\n\n").trim();
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export type DoctorLLMSections = {
  clinical_implications: string[];
  management_options: string[];
  supportive_palliative: string[];
  red_flags: string[];
};

export function renderDeterministicDoctorReport(
  p: Patient,
  sections: DoctorLLMSections
): string {
  const header = `**Demographics**
- **Name:** ${p.name || "Unknown"}
- **Age:** ${p.age ?? "—"}
- **Sex:** ${p.sex ?? "—"}
- **Encounter Date:** ${p.encounterDate ?? "—"}`;

  const dxs = (p.diagnoses || [])
    .map(d => {
      const c = codeForDx(d);
      const parts = [`- ${titleCase(d)}`];
      if (c.icd10) parts.push(`ICD-10: *${c.icd10}*`);
      if (c.snomed) parts.push(`SNOMED: *${c.snomed}*`);
      return parts.join(" — ");
    })
    .join("\n") || "- Not specified";

  const cmb = (p.comorbidities || []).concat(
    p.allergies?.length ? p.allergies.map(a => `Allergy: ${a}`) : []
  );
  const cmbBlock = cmb.length
    ? cmb.map(x => `- ${titleCase(x)}`).join("\n")
    : "- None listed";

  const medsBlock =
    (p.meds || [])
      .map(m => {
        const atc = codeForDrug(m);
        return atc ? `- ${titleCase(m)} — ATC: *${atc}*` : `- ${titleCase(m)}`;
      })
      .join("\n") || "- None documented";

  const labsBlock =
    (p.labs || [])
      .map(l => {
        const meta = codeForLab(l.name);
        const code = meta ? `LOINC: *${meta.code}*` : "";
        const unit = l.unit || meta?.unit || "";
        const ref = meta?.ref ? ` (ref: ${meta.ref})` : "";
        return `- ${titleCase(l.name)} — ${l.value}${unit ? " " + unit : ""} ${code}${ref}`;
      })
      .join("\n") || "- No labs provided";

  const safe = (arr?: string[]) =>
    (arr && arr.length ? arr : ["[No items provided]"]).map(s => `- ${s}`).join("\n");

  return [
    header,
    `**Diagnoses**\n${dxs}`,
    `**Comorbidities**\n${cmbBlock}`,
    `**Medications**\n${medsBlock}`,
    `**Labs & Imaging**\n${labsBlock}`,
    `**Clinical Implications**\n${safe(sections.clinical_implications)}`,
    `**Management Options**\n${safe(sections.management_options)}`,
    `**Supportive / Palliative Measures**\n${safe(sections.supportive_palliative)}`,
    `**Red Flags**\n${safe(sections.red_flags)}`,
  ]
    .join("\n\n")
    .trim();
}
