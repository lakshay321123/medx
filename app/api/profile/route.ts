export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import {
  OBSERVATION_LABELS as LABELS,
  ObservationGroupKey as GroupKey,
  classifyObservation,
  normalizeObservationKind,
  startCaseObservation,
} from "@/lib/supabase/observationGroups";

function noStoreHeaders() {
  return { "Cache-Control": "no-store, max-age=0" };
}

// Group types for the UI
type Item = {
  key: string;                 // observation kind (e.g., "alt", "mri_report")
  label: string;               // human-friendly label
  value: string | number | null;
  unit: string | null;
  observedAt: string;
  source?: string | null;      // modality/source (e.g., "MRI", "PDF", "Rx")
};
type Groups = Record<GroupKey, Item[]>;

export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { profile: null },
      { status: 200, headers: noStoreHeaders() }
    );
  }

  const sb = supabaseAdmin();

  const { data: profile, error: perr } = await sb
    .from("profiles")
    .select(
      "id, full_name, dob, sex, blood_group, conditions_predisposition, chronic_conditions"
    )
    .eq("id", userId)
    .maybeSingle();
  if (perr) {
    return NextResponse.json({ error: perr.message }, { status: 500, headers: noStoreHeaders() });
  }

  // --- normalize arrays: accept text[] or JSON-stringified arrays ---
  const asArray = (x: any) => {
    if (Array.isArray(x)) return x;
    if (typeof x === "string") {
      try {
        const p = JSON.parse(x);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  if (profile) {
    (profile as any).conditions_predisposition = asArray((profile as any).conditions_predisposition);
    (profile as any).chronic_conditions = asArray((profile as any).chronic_conditions);
  }

  const { data: rows, error: oerr } = await sb
    .from("observations")
    .select("kind, value_num, value_text, unit, observed_at, meta")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false })
    .limit(600);
  if (oerr) {
    return NextResponse.json({ error: oerr.message }, { status: 500, headers: noStoreHeaders() });
  }

  // Keep only latest per kind
  const latestByKind = new Map<
    string,
    { value: string | number | null; unit: string | null; observedAt: string; meta: any }
  >();
  for (const r of rows ?? []) {
    if (latestByKind.has(r.kind)) continue; // first seen = latest
    latestByKind.set(r.kind, {
      value: r.value_num ?? r.value_text ?? null,
      unit: r.unit ?? null,
      observedAt: r.observed_at,
      meta: r.meta ?? null,
    });
  }

  // Build groups
  const groups: Groups = {
    vitals: [],
    labs: [],
    imaging: [],
    medications: [],
    diagnoses: [],
    procedures: [],
    immunizations: [],
    notes: [],
    other: [],
  };

  for (const [rawKind, info] of latestByKind.entries()) {
    const kind = normalizeObservationKind(rawKind);
    const group = classifyObservation(rawKind, info.meta);
    const label = LABELS[kind] ?? startCaseObservation(kind);

    let val: string | number | null = info.value;
    if (typeof val === "string" && val.length > 160) {
      val = val.slice(0, 155).trimEnd() + "…";
    }

    groups[group].push({
      key: kind,
      label,
      value: val,
      unit: info.unit,
      observedAt: info.observedAt,
      source: info.meta?.modality || info.meta?.source_type || null,
    });
  }

  // Sort each group by date (desc)
  (Object.keys(groups) as GroupKey[]).forEach(g =>
    groups[g].sort((a, b) => (a.observedAt > b.observedAt ? -1 : 1))
  );

  // Optional backward-compat: simple latest map (in case anything still expects it)
  const latest: Record<string, { value: string | number | null; unit: string | null; observedAt: string } | null> = {};
  for (const [k, v] of latestByKind) {
    latest[k] = { value: v.value, unit: v.unit, observedAt: v.observedAt };
  }

  return NextResponse.json({ profile: profile ?? null, groups, latest }, { headers: noStoreHeaders() });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();                  // must be a UUID (see Option B if testing)
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const allowed = [
    "full_name",
    "dob",
    "sex",
    "blood_group",
    "conditions_predisposition",
    "chronic_conditions",
  ] as const;

  const patch: Record<string, any> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  // Create-or-update by primary key id
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

