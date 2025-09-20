// src/types/coding.ts

export type CodingMode = 'doctor' | 'doctor_research';

export interface CodingSummaryRow {
  label: string;
  value: string;
}

export interface ModifierRow {
  modifier: string;
  useCase: string;
}

interface ClaimLine {
  cpt: string;
  modifiers?: string[];
  dxPointers?: number[]; // 1-based pointers matching Box 21 order
  units?: number;        // default 1 if omitted by the model
  pos?: string;          // e.g., "21" | "22" | "24"
  notes?: string;        // Box 19
  charge?: number | null;
}

export type UniversalCodingClaimLine = ClaimLine;

export interface UniversalCodingAnswer {
  mode: CodingMode;
  quickSummary: CodingSummaryRow[];
  modifiers: ModifierRow[];
  ncciBundlingBullets: string[];
  claimExample: {
    dxCodes: string[];                 // ≤4, ordered for CMS-1500 Box 21
    claimLines: ClaimLine[];
    authBox23?: string | null;
  };
  checklist: string[];
  // Doctor+Research only:
  rationale?: string;
  payerNotes?: string[];
  icdSpecificity?: string[];
  references?: { label: string; url?: string }[];
}
