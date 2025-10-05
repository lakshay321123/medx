import { FormatMeta, Mode } from './types';

export const FORMATS: FormatMeta[] = [
  {
    id: 'essay',
    label: { en: 'Essay', hi: 'निबंध', es: 'Ensayo', it: 'Saggio' },
    allowedModes: ['wellness', 'therapy', 'wellness_research', 'clinical', 'clinical_research', 'aidoc'],
    systemHint: `Write a cohesive, logically-structured essay with clear headings and short paragraphs.`,
    userGuide: `Prefer plain language; avoid jargon unless requested.`,
    canonicalHeading: 'what it is',
  },
  {
    id: 'bullet_summary',
    label: { en: 'Bulleted summary', hi: 'बुलेट सार', es: 'Resumen con viñetas', it: 'Riepilogo puntato' },
    allowedModes: ['wellness', 'therapy', 'wellness_research', 'clinical', 'clinical_research'],
    systemHint: `Summarize into concise bullet points with sub-bullets for details.`,
  },
  {
    id: 'faq',
    label: { en: 'FAQ', hi: 'अक्सर पूछे जाने वाले प्रश्न', es: 'Preguntas frecuentes', it: 'Domande frequenti' },
    allowedModes: ['wellness', 'therapy', 'wellness_research', 'clinical'],
    systemHint: `Produce a Q&A list. Each answer should be brief and actionable.`,
  },
  {
    id: 'soap_note',
    label: { en: 'SOAP note', hi: 'SOAP नोट', es: 'Nota SOAP', it: 'Nota SOAP' },
    allowedModes: ['clinical', 'clinical_research'],
    systemHint: `Structure as SOAP: Subjective, Objective, Assessment, Plan. Keep ICD/meds generic unless provided.`,
  },
  {
    id: 'care_plan',
    label: { en: 'Care plan', hi: 'केयर प्लान', es: 'Plan de cuidados', it: 'Piano di cura' },
    allowedModes: ['clinical', 'clinical_research'],
    systemHint: `Deliver a concise care plan: Goals, Interventions, Monitoring, Red flags.`,
  },
  {
    id: 'abstract_imrad',
    label: { en: 'Research abstract (IMRaD)', hi: 'संक्षेप (IMRaD)', es: 'Resumen IMRaD', it: 'Abstract IMRaD' },
    allowedModes: ['wellness_research', 'clinical_research', 'aidoc'],
    systemHint: `Use IMRaD headings: Introduction, Methods, Results, Discussion (and Limitations if relevant).`,
    canonicalHeading: 'overview',
  },
  {
    id: 'table_compare',
    label: { en: 'Comparison table', hi: 'तुलनात्मक तालिका', es: 'Tabla comparativa', it: 'Tabella comparativa' },
    allowedModes: ['wellness', 'clinical', 'wellness_research', 'clinical_research', 'aidoc'],
    systemHint: [
      'Return a **single markdown table only** (no paragraphs before or after).',
      'Columns (exact, in this order): Topic | Mechanism/How it works | Expected benefit | Limitations/Side effects | Notes/Evidence',
      'Keep cells concise (<= 20 words).',
      'If information is missing, leave the cell blank rather than adding prose.',
    ].join('\n'),
  },
  {
    id: 'json_structured',
    label: { en: 'Structured JSON', hi: 'संरचित JSON', es: 'JSON estructurado', it: 'JSON strutturato' },
    allowedModes: ['aidoc', 'clinical_research', 'wellness_research'],
    systemHint: `Strictly return valid JSON matching the provided schema. Do not add commentary.`,
  },
  {
    id: 'step_by_step',
    label: { en: 'Step-by-step', hi: 'चरण-दर-चरण', es: 'Paso a paso', it: 'Passo dopo passo' },
    allowedModes: ['wellness', 'therapy', 'clinical', 'aidoc'],
    systemHint: `Outline the process in clear, numbered steps. Each step should include actionable detail and required context.`,
  },
  {
    id: 'patient_leaflet',
    label: { en: 'Patient leaflet', hi: 'रोगी पुस्तिका', es: 'Folleto para pacientes', it: 'Opuscolo per pazienti' },
    allowedModes: ['wellness', 'therapy', 'clinical'],
    systemHint: `Communicate in friendly, plain language at approximately a 5th-grade reading level. Use short sections with reassuring tone.`,
    userGuide: `Include what it is, why it matters, do's & don'ts, and when to seek help.`,
  },
  {
    id: 'checklist',
    label: { en: 'Checklist', hi: 'जाँच सूची', es: 'Lista de verificación', it: 'Lista di controllo' },
    allowedModes: ['clinical', 'clinical_research', 'aidoc'],
    systemHint: `Provide a concise checklist with checkbox-style bullets. Group related items with short subheadings when useful.`,
  },
  {
    id: 'algorithm',
    label: { en: 'Algorithm', hi: 'एल्गोरिदम', es: 'Algoritmo', it: 'Algoritmo' },
    allowedModes: ['clinical', 'clinical_research', 'aidoc'],
    systemHint: `Lay out a decision pathway with conditional branches. Use nested bullets or numbered logic to reflect if/then choices.`,
  },
];

export function isFormatAllowed(id: FormatMeta['id'], mode: Mode) {
  const f = FORMATS.find(x => x.id === id);
  return !!f && f.allowedModes.includes(mode);
}
