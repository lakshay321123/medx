import { NextRequest, NextResponse } from "next/server";
import { checkMedicationAllergies } from "@/lib/allergy/meds";

export async function POST(req: NextRequest) {
  if ((process.env.ALLERGY_CHECKER || "true").toLowerCase() !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { allergies, meds, region } = body || {};
  if (!Array.isArray(allergies) || !allergies.length || !Array.isArray(meds) || !meds.length) {
    return NextResponse.json({ error: "allergies and meds required" }, { status: 400 });
  }
  const res = await checkMedicationAllergies(allergies, meds, region || "");
  console.log({ allergies_n: allergies.length, meds_n: meds.length, conflicts_n: res.conflicts.length });
  return NextResponse.json(res);
}
