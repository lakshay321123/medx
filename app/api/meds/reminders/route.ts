import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

/**
 * Ensure a patient record exists for this user. Returns patient_id.
 */
async function ensurePatient(db: ReturnType<typeof supabaseAdmin>, userId: string): Promise<string> {
  const { data } = await db
    .from("patients")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();
  if (data?.id) return data.id;

  // Create patient record linked to this user
  const { data: newPatient, error } = await db
    .from("patients")
    .insert({ owner_user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create patient: ${error.message}`);
  return newPatient!.id;
}

/**
 * Find or create a medication by name for this patient.
 */
async function ensureMedication(
  db: ReturnType<typeof supabaseAdmin>,
  patientId: string,
  medName: string,
  dose?: string,
  frequency?: string,
): Promise<string> {
  const { data } = await db
    .from("medications")
    .select("id")
    .eq("patient_id", patientId)
    .eq("name", medName)
    .eq("active", true)
    .limit(1)
    .single();
  if (data?.id) return data.id;

  const { data: newMed, error } = await db
    .from("medications")
    .insert({
      patient_id: patientId,
      name: medName,
      dose: dose ?? null,
      frequency: frequency ?? null,
      active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create medication: ${error.message}`);
  return newMed!.id;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("med_reminders")
    .select("*, medications(name, dose, frequency)")
    .eq("user_id", userId)
    .order("reminder_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { medName, dose, frequency, reminderTime, daysOfWeek, notifyChannel } = body;

  if (!medName || !reminderTime) {
    return NextResponse.json(
      { error: "medName and reminderTime are required" },
      { status: 400 },
    );
  }

  try {
    const db = supabaseAdmin();

    // Auto-create patient + medication chain if needed
    const patientId = await ensurePatient(db, userId);
    const medicationId = await ensureMedication(db, patientId, medName, dose, frequency);

    const { data, error } = await db
      .from("med_reminders")
      .insert({
        user_id: userId,
        medication_id: medicationId,
        reminder_time: reminderTime,
        days_of_week: daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
        notify_channel: notifyChannel ?? "push",
        enabled: true,
      })
      .select("*, medications(name, dose, frequency)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, reminder: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create reminder" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const reminderId = url.searchParams.get("id");
  if (!reminderId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("med_reminders")
    .delete()
    .eq("id", reminderId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
