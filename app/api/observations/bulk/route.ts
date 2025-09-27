export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

type InObs = {
  kind: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null; // ISO
  thread_id?: string | null;
  meta?: any; // jsonb
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const list: InObs[] = Array.isArray(payload?.observations)
    ? payload.observations
    : Array.isArray(payload?.items)
    ? payload.items
    : [];

  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ error: "observations[] required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows = list.map(x => {
    const rawKind = typeof x?.kind === "string" ? x.kind : "";
    const kind = rawKind.toLowerCase() || "observation";
    const incomingMeta = { ...(x?.meta ?? {}) };
    const baseName =
      incomingMeta.normalizedName ??
      (typeof x?.value_text === "string" ? x.value_text : null) ??
      (typeof rawKind === "string" && rawKind.trim() ? rawKind : "Observation");

    const doseLabel = incomingMeta.doseLabel ?? null;
    const numericDose =
      x?.value_num != null
        ? `${x.value_num}${x?.unit ? ` ${x.unit}` : ""}`
        : null;

    let fallbackSummary = baseName;
    let fallbackText = incomingMeta.text;

    if (kind === "medication") {
      const dose = doseLabel ?? numericDose;
      if (dose) {
        fallbackSummary = baseName ? `${baseName} — ${dose}` : dose;
      }
      if (!fallbackText) {
        fallbackText = doseLabel
          ? `${baseName} (${doseLabel}) saved from Medical Profile`
          : baseName;
      }
    } else if (kind === "note" || kind === "symptom") {
      const text = typeof x?.value_text === "string" ? x.value_text : incomingMeta.text ?? "";
      if (text) {
        const trimmed = text.trim();
        if (trimmed) {
          fallbackText = trimmed;
          fallbackSummary = trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
        }
      }
    } else if (kind === "lab") {
      const abnormal = incomingMeta.abnormalHint ?? incomingMeta.topFinding ?? null;
      const title = incomingMeta.fileTitle ?? incomingMeta.testName ?? null;
      fallbackSummary = abnormal || title || baseName;
      if (!fallbackText) {
        fallbackText = abnormal || title || incomingMeta.text || baseName;
      }
    } else if (kind === "imaging") {
      const finding = incomingMeta.finding ?? incomingMeta.impression ?? incomingMeta.fileTitle ?? null;
      fallbackSummary = finding || baseName;
      if (!fallbackText) fallbackText = finding || incomingMeta.text || baseName;
    }

    const meta = { ...incomingMeta };
    if (!meta.summary) meta.summary = fallbackSummary ?? baseName;
    if (!meta.text) meta.text = fallbackText ?? fallbackSummary ?? baseName;
    meta.source = meta.source ?? "bulk";

    return {
      user_id: userId,
      kind,
      value_num: x?.value_num ?? null,
      value_text: x?.value_text ?? null,
      unit: x?.unit ?? null,
      observed_at: x?.observed_at ?? now,
      thread_id: x?.thread_id ?? null,
      meta,
    };
  });

  const { data, error } = await supabaseAdmin()
    .from("observations")
    .insert(rows)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, observations: data ?? [] });
}
