export type UniversalCodingMode = "doctor" | "doctor+research";

export type CodingCaseInput = {
  /** Short narrative of the clinical scenario, including procedures and diagnoses. */
  scenario: string;
  /** Optional specialty focus to steer the coder. */
  specialty?: string;
  /** Place of service (e.g. 11, 21) */
  placeOfService?: string;
  /** Named payer or plan-specific considerations */
  payer?: string;
  /** Additional chart highlights, prior auth notes, documentation cues */
  additionalNotes?: string;
};

export type ClaimLine = {
  cpt: string;
  description?: string;
  modifiers?: string[];
  dxPointers: string[];
  pos: string;
  units: string;
  notes?: string;
};

export type ClaimExample = {
  dxCodes: string[];
  claimLines: ClaimLine[];
  authBox23?: string;
};

export type ReferenceEntry = {
  title: string;
  url?: string;
  note?: string;
};

export type UniversalCodingAnswer = {
  quickSummary: string[];
  modifiers: string[];
  ncciBundlingBullets: string[];
  claimExample: ClaimExample;
  checklist: string[];
  rationale?: string;
  payerNotes?: string[];
  icdSpecificity?: string[];
  references?: ReferenceEntry[];
};
