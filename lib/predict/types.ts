export type UIProfile = {
  id?: string;
  sex?: string;
  dob?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  smoking?: "yes" | "no" | "unknown";
  alcohol?: "yes" | "no" | "unknown";
  diagnoses?: string[];
  allergies?: string[];
};

export type UIObservation = {
  id?: string;
  observed_at?: string;
  type?: string; // e.g., "bp", "hr", "spo2", "temp", "note"
  value?: string | number; // keep as shown in UI
  units?: string;
  note?: string;
};

export type UILabValue = {
  id?: string;
  observed_at?: string;
  analyte?: string; // "LDL-C", "HDL-C", "TG", "A1c", "Creatinine", etc.
  value?: number | string;
  units?: string; // "mg/dL", "mmol/L" etc.
  ref_low?: number | null;
  ref_high?: number | null;
  report_id?: string | null;
};

export type UIMedication = {
  id?: string;
  name?: string;
  strength?: string;
  route?: string;
  freq?: string;
  start_date?: string;
  stop_date?: string | null;
};

export type UITextChunk = {
  ref: string; // file_id:page:chunk_index
  text: string; // OCR/parsed text the UI already renders
};

// What the client will POST to the server (from the same data the UI shows)
export type PredictionBundle = {
  profile?: UIProfile | null;
  observations?: UIObservation[];
  labs?: UILabValue[];
  meds?: UIMedication[];
  chunks?: UITextChunk[]; // recent/topical report text
};
