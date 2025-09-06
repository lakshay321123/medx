export type TrialID = {
  nct?: string;     // NCT01234567
  ctri?: string;    // CTRI/2021/05/012345
  euctr?: string;   // EudraCT 2018-XXXXXX-XX
  isrctn?: string;  // ISRCTN12345678
  other?: string;
};

export type TrialRecord = {
  ids: TrialID;
  title: string;
  condition: string[];
  phase?: string;                 // "Phase 2", "Phase 3", etc.
  status?: string;                // Recruiting, Active, Completed, etc.
  interventions?: string[];
  primaryOutcome?: string;
  locations?: { city?: string; country?: string; site?: string }[];
  startDate?: string;             // ISO
  lastUpdated?: string;           // ISO
  sources: { name: string; url: string }[]; // include all source links
};
