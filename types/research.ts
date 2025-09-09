export type Paper = {
  id: string;
  title: string;
  abstract?: string | null;
  year?: number | null;
  type?: string | null;
  authors?: { name: string; id?: string }[];
  venue?: { name?: string | null; issn?: string | null };
  cited_by_count?: number;
  is_oa?: boolean;
  oa_url?: string | null;
  url?: string | null;
  doi?: string | null;
  source: "openalex" | "semanticscholar" | "europepmc" | "crossref";
};

export type Trial = {
  id: string;
  title: string;
  conditions: string[];
  interventions: string[];
  status?: string;
  phase?: string;
  start?: string;
  complete?: string;
  type?: string;
  sponsor?: string;
  site?: string;
  city?: string;
  country?: string;
  eligibility?: string;
  primaryOutcome?: string;
  url?: string;
  source: "ctgov" | "isrctn" | "euctr" | "ictrp";
};

export type TrialRecord = {
  registry: "NCT" | "CTRI" | "EUCTR" | string;
  registry_id: string;                 // e.g. NCT01234567 or CTRI/2024/08/012345
  title: string;
  condition?: string;
  phase?: string;                      // "Phase 2" / "Phase III" etc.
  status?: string;                     // "Recruiting" / "Active" / "Completed"
  locations?: string[];                // ["Mumbai, India", "Delhi, India"]
  url: string;                         // deep link to registry page
  when?: { registered?: string; updated?: string }; // ISO strings preferred
  snippet?: string;                    // optional short blurb
};
