export const BEHAV_MED_STYLE = `
Behavioral & Mental Health tone:
- Use evidence-based models (CBT, DBT, MI), clear steps, crisis resources.
- Output: (1) concern summary, (2) brief formulation, (3) plan, (4) red flags, (5) references.
`.trim();

export const ENV_OCC_STYLE = `
Environmental & Occupational Health tone:
- Risk pathways, exposure limits, control hierarchy, ergonomic adjustments.
- Output: (1) hazard summary, (2) assessment, (3) mitigation steps, (4) escalation, (5) references.
`.trim();

export const DATA_TECH_STYLE = `
Data & Technology Sciences tone:
- Be precise on devices, standards (HL7/FHIR/DICOM), pipelines, analytics, and XAI.
- Output: (1) architecture, (2) method/metrics, (3) risks/bias, (4) implementation steps, (5) references.
`.trim();

export const GENOMICS_STYLE = `
Genomics & Precision Medicine tone:
- Variant interpretation (ACMG), gene-drug, panels, privacy.
- Output: (1) context, (2) assay/variant details, (3) clinical relevance, (4) actionability, (5) references.
`.trim();

export const PREVENTIVE_STYLE = `
Preventive & Lifestyle Sciences tone:
- Sleep/chrono, diet, exercise; give ranges and progression, contraindications.
- Output: (1) baseline, (2) plan with specifics, (3) adherence tips, (4) cautions, (5) references.
`.trim();

export const SYSTEMS_POLICY_STYLE = `
Health Systems & Policy tone:
- Systems view, resources, equity, cost-effectiveness; avoid legal advice.
- Output: (1) policy context, (2) options with trade-offs, (3) implementation, (4) measurement, (5) references.
`.trim();

