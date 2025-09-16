import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  PatientDataset,
  PatientRow,
  VitalRow,
  LabRow,
  MedicationRow,
  EncounterRow,
  NoteRow,
} from "./types";

function ensureArray<T>(value: T | T[] | null): T[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as T[];
  return [value];
}

function normalizeNoteTags(tags: any): string[] | null {
  const arr = ensureArray<string>(tags);
  if (!arr) return null;
  return arr.map(t => String(t)).filter(Boolean);
}

export async function fetchPatientDataset(patientId: string): Promise<PatientDataset> {
  const client = supabaseAdmin();
  const [patientRes, vitalsRes, labsRes, medsRes, encountersRes, notesRes] = await Promise.all([
    client.from("patients").select("*").eq("id", patientId).maybeSingle(),
    client.from("vitals").select("*").eq("patient_id", patientId).order("taken_at", { ascending: true }),
    client.from("labs").select("*").eq("patient_id", patientId).order("taken_at", { ascending: true }),
    client.from("medications").select("*").eq("patient_id", patientId).order("start_at", { ascending: true }),
    client.from("encounters").select("*").eq("patient_id", patientId).order("start_at", { ascending: true }),
    client.from("notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: true }),
  ]);

  if (patientRes.error) throw new Error(patientRes.error.message);
  if (!patientRes.data) throw new Error("patient not found");

  const wrap = <T>(res: { data: T[] | null; error: any }): T[] => {
    if (res.error) throw new Error(res.error.message);
    return res.data ?? [];
  };

  const patient = patientRes.data as PatientRow;
  const vitals = wrap<VitalRow>(vitalsRes as any);
  const labs = wrap<LabRow>(labsRes as any);
  const medications = wrap<MedicationRow>(medsRes as any);
  const encounters = wrap<EncounterRow>(encountersRes as any);
  const notesRaw = wrap<NoteRow>(notesRes as any);

  const notes = notesRaw.map(note => ({
    ...note,
    tags: normalizeNoteTags((note as any).tags),
  }));

  return {
    patient,
    vitals,
    labs,
    medications,
    encounters,
    notes,
  };
}
