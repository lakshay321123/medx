export type TrialRow = {
  id: string;                      // NCT id
  title: string;
  conditions: string[];
  interventions: string[];
  status: string;                  // Recruiting, Active, Completed
  phase: string;                   // Phase 1/2/3/4, NA
  start?: string;
  complete?: string;
  type?: string;                   // Interventional/Observational
  sponsor?: string;
  site?: string;                   // first site name
  city?: string;
  country?: string;
  eligibility?: string;            // raw text
  primaryOutcome?: string;         // first primary outcome if present
  url: string;                     // https://clinicaltrials.gov/study/NCT
};
