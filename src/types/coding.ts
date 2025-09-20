export type UniversalCodingMode = 'doctor' | 'doctor_research';

export interface UniversalCodingQuickSummaryItem {
  label: string;
  value: string;
  notes?: string;
}

export interface UniversalCodingModifierItem {
  modifier: string;
  useCase: string;
}

export interface UniversalCodingClaimLine {
  cpt: string;
  modifiers?: string[];
  dxPointers: string[];
  pos: string;
  units: number;
  notes?: string;
  charge?: number;
}

export interface UniversalCodingReference {
  label: string;
  url: string;
}

export interface UniversalCodingClaimExample {
  dxCodes: string[];
  claimLines: UniversalCodingClaimLine[];
  authBox23?: string;
}

export interface UniversalCodingBaseAnswer {
  mode: UniversalCodingMode;
  quickSummary: UniversalCodingQuickSummaryItem[];
  modifiers: UniversalCodingModifierItem[];
  ncciBundlingBullets: string[];
  claimExample: UniversalCodingClaimExample;
  checklist: string[];
}

export interface UniversalCodingDoctorAnswer extends UniversalCodingBaseAnswer {
  mode: 'doctor';
  rationale?: never;
  payerNotes?: never;
  icdSpecificity?: never;
  references?: never;
}

export interface UniversalCodingDoctorResearchAnswer extends UniversalCodingBaseAnswer {
  mode: 'doctor_research';
  rationale: string;
  payerNotes: string[];
  icdSpecificity: string[];
  references: UniversalCodingReference[];
}

export type UniversalCodingAnswer =
  | UniversalCodingDoctorAnswer
  | UniversalCodingDoctorResearchAnswer;

export interface UniversalCodingInput {
  clinicalContext: string;
  specialty?: string;
  suspectedDiagnosis?: string;
  procedureDetails?: string;
  payer?: string;
  placeOfService?: string;
  additionalNotes?: string;
}
