export type Mode =
  | 'wellness'
  | 'clinical'
  | 'therapy'
  | 'wellness_research'
  | 'clinical_research'
  | 'aidoc';

export type FormatId =
  | 'essay'
  | 'bullet_summary'
  | 'faq'
  | 'table_compare'
  | 'step_by_step'
  | 'soap_note'
  | 'care_plan'
  | 'patient_leaflet'
  | 'abstract_imrad'
  | 'json_structured'
  | 'checklist'
  | 'algorithm';

export type Lang = 'en' | 'hi' | 'es' | 'it' | 'fr' | 'ar' | 'de' | 'zh';

export interface FormatMeta {
  id: FormatId;
  label: Partial<Record<Lang, string>>;
  allowedModes: Mode[];
  systemHint: string;
  userGuide?: string;
  canonicalHeading?: string;
}
