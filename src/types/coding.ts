export type CodingMode = 'doctor' | 'doctor_research';

export interface CodingSummaryRow {
  label: string;
  value: string;
}

export interface ModifierRow {
  modifier: string;
  useCase: string;
}

export interface ClaimLine {
  cpt: string;
  modifiers?: string[];
  dxPointers?: number[];
  units?: number;
  pos?: string;
  notes?: string;
  charge?: number | null;
}

export interface UniversalCodingAnswer {
  mode: CodingMode;
  quickSummary: CodingSummaryRow[];
  modifiers: ModifierRow[];
  ncciBundlingBullets: string[];
  claimExample: {
    dxCodes: string[];
    claimLines: ClaimLine[];
    authBox23?: string | null;
  };
  checklist: string[];
  rationale?: string;
  payerNotes?: string[];
  icdSpecificity?: string[];
  references?: {
    label: string;
    url?: string;
  }[];
}

export type UniversalCodingClaimLine = ClaimLine;
