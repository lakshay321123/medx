import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

let cachedPatientId: string | null = null;
let pendingLoad: Promise<string | null> | null = null;

function isTrue(value: string | undefined | null) {
  return String(value ?? "").toLowerCase() === "true";
}

async function loadDefaultPatientId(): Promise<string | null> {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("profiles")
      .select("default_patient_id")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("patientContext: failed to resolve default patient", error.message);
      return null;
    }
    const pid = (data as { default_patient_id?: string | null } | null)?.default_patient_id ?? null;
    if (pid) cachedPatientId = pid;
    return pid;
  } catch (err) {
    console.error("patientContext: unexpected error resolving patient", err);
    return null;
  }
}

export async function getActivePatientId(_req?: NextRequest): Promise<string> {
  if (isTrue(process.env.TEST_MODE)) {
    const id = process.env.TEST_PATIENT_ID;
    if (!id) {
      throw new Error("TEST_MODE enabled but TEST_PATIENT_ID is not configured");
    }
    return id;
  }

  if (cachedPatientId) return cachedPatientId;

  if (!pendingLoad) {
    pendingLoad = loadDefaultPatientId();
  }

  const resolved = await pendingLoad;
  pendingLoad = null;

  if (!resolved) {
    throw new Error("Active patient id unavailable");
  }
  cachedPatientId = resolved;
  return resolved;
}

export function resetPatientCache() {
  cachedPatientId = null;
  pendingLoad = null;
}
