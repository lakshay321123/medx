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
