export type FamilyHistoryItem = {
  relation: "father" | "mother" | "sibling" | "child";
  condition: string;
  onsetAge?: number;
};

export type ImmunizationItem = {
  vaccine: string;
  date: string;
  lot?: string;
  source?: string;
};

export type Lifestyle = {
  smoking: {
    status: "none" | "former" | "current";
    packsPerDay?: number;
    years?: number;
  };
  alcohol: {
    status: "none" | "occasional" | "regular";
    unitsPerWeek?: number;
  };
  drugs?: string;
  diet?: string;
  activity?: string;
  sleep?: string;
  occupation?: string;
  exposures?: string;
};

export type SurgeryItem = {
  procedure: string;
  date: string;
  notes?: string;
};

export type Accessibility = {
  mobility?: string;
  vision?: string;
  hearing?: string;
  communication?: string;
};

export type AdvanceDirectives = {
  codeStatus?: "FULL" | "DNR" | "DNI";
  surrogateName?: string;
  surrogatePhone?: string;
  documentUrl?: string;
};

export type MedicalProfile = {
  id?: string;
  full_name?: string | null;
  dob?: string | null;
  sex?: string | null;
  blood_group?: string | null;
  conditions_predisposition?: string[] | null;
  chronic_conditions?: string[] | null;
  vitals?: Record<string, unknown> | null;
  familyHistory?: FamilyHistoryItem[];
  immunizations?: ImmunizationItem[];
  lifestyle?: Lifestyle;
  surgeries?: SurgeryItem[];
  accessibility?: Accessibility;
  advanceDirectives?: AdvanceDirectives;
  profile_extra?: unknown;
};
