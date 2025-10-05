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
    systemHint: `Return a simple markdown table with consistent columns and short cells.`,
  },
  {
    id: 'json_structured',
    label: { en: 'Structured JSON', hi: 'संरचित JSON', es: 'JSON estructurado', it: 'JSON strutturato' },
    allowedModes: ['aidoc', 'clinical_research', 'wellness_research'],
    systemHint: `Strictly return valid JSON matching the provided schema. Do not add commentary.`,
  },
  // add more as needed...
];

export function isFormatAllowed(id: FormatMeta['id'], mode: Mode) {
  const f = FORMATS.find(x => x.id === id);
  return !!f && f.allowedModes.includes(mode);
}
