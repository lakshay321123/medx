export type TrialDesign = {
  masking?: string | null;
  allocation?: string | null;
  model?: string | null;
  arms?: number | null;
};

export type TrialPopulation = {
  age?: string | null;
  sex?: string | null;
  targetEnrollment?: number | null;
  countries: string[];
};

export type TrialIntervention = {
  type?: string | null;
  name?: string | null;
};

export type TrialOutcome = {
  title: string;
  timeFrame?: string | null;
};

export type TrialEligibility = {
  keyInclusion: string[];
  keyExclusion: string[];
};

export type TrialContacts = {
  sponsor?: string | null;
  locationsCount?: number | null;
};

export type TrialDates = {
  start?: string | null;
  primaryCompletion?: string | null;
  completion?: string | null;
};

export type TrialSource = {
  label: string;
  url: string;
};

export type TrialFacts = {
  nctId: string;
  title?: string | null;
  status?: string | null;
  phase?: string | null;
  studyType?: string | null;
  conditions: string[];
  design: TrialDesign;
  population: TrialPopulation;
  interventions: TrialIntervention[];
  outcomes: {
    primary: TrialOutcome[];
  };
  eligibility: TrialEligibility;
  contacts: TrialContacts;
  dates: TrialDates;
  sources: TrialSource[];
  error?: string | null;
};

export type TrialSummaryMarkdown = {
  nctId: string;
  markdown: string;
};
