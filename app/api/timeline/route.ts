export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { buildShortSummaryFromText } from "@/lib/shortSummary";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const iso = (ts: any) => {
  const d = new Date(ts || Date.now());
  return isNaN(+d) ? new Date().toISOString() : d.toISOString();
};

const pickObserved = (r: any) =>
  iso(
    r.report_date ??
      r.meta?.report_date ??
      r.details?.report_date ??
      r.observed_at ??
      r.observedAt ??
      r.recorded_at ??
      r.measured_at ??
      r.taken_at ??
      r.sampled_at ??
      r.timestamp ??
      r.created_at ??
      r.createdAt ??
      r.meta?.observed_at ??
      r.details?.observed_at
  );

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode")?.toLowerCase();
  if (mode !== "ai-doc") {
    return NextResponse.json(
      { error: "Timeline is available only in AI Doc mode" },
      { status: 403, headers: noStore }
    );
  }
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] }, { headers: noStore });

  const supa = supabaseAdmin();

  // Query both sources; tolerate failures by falling back to empty arrays.
  const [predRes, obsRes] = await Promise.all([
    supa.from("predictions").select("*").eq("user_id", userId),
    supa.from("observations").select("*").eq("user_id", userId),
  ]);

  const predErr = predRes.error || null;
  const obsErr = obsRes.error || null;

  if (predErr) {
    // If predictions table/permissions are missing, keep going with observations only.
    console.warn("[timeline] predictions error:", predErr.message || predErr);
  }
  if (obsErr) {
    // If observations has an issue, still continue (UI will show whatever we have).
    console.warn("[timeline] observations error:", obsErr.message || obsErr);
  }

  const predRows: any[] = Array.isArray(predRes.data) ? predRes.data : [];
  const obsRows: any[] = Array.isArray(obsRes.data) ? obsRes.data : [];

  const preds = predRows.map((r: any) => {
    const d = r?.details ?? r?.meta ?? {};
    const name =
      r?.name ??
      r?.label ??
      r?.finding ??
      r?.type ??
      d?.analyte ??
      d?.test_name ??
      d?.label ??
      d?.name ??
      d?.task ??
      "Prediction";
    const prob =
      typeof r?.probability === "number"
        ? r.probability
        : typeof d?.fractured === "number"
        ? d.fractured
        : typeof d?.probability === "number"
        ? d.probability
        : null;

    return {
      id: String(r?.id ?? cryptoRandomId()),
      kind: "prediction",
      name,
      probability: prob,
      observed_at: pickObserved(r),
      uploaded_at: iso(r?.created_at ?? r?.createdAt),
      meta: d || {},
      file: null,
    };
  });

  const obs = obsRows.map((r: any) => {
    const m = r?.meta ?? r?.details ?? {};
    try {
      if (!m.summary) {
        m.summary = buildShortSummaryFromText(m.text, m.summary_long);
      }
    } catch {
      // ignore summarizer issues; keep row usable
    }
    const kind = typeof r?.kind === "string" ? r.kind.toLowerCase() : "observation";
    const name =
      r?.name ??
      r?.metric ??
      r?.test ??
      m?.normalizedName ??
      m?.analyte ??
      m?.test_name ??
      m?.label ??
      kind ??
      "Observation";
    const valueNum =
      typeof r?.value_num === "number"
        ? r.value_num
        : typeof r?.value === "number"
        ? r.value
        : typeof m?.value_num === "number"
        ? m.value_num
        : null;
    const valueText =
      typeof r?.value_text === "string"
        ? r.value_text
        : typeof r?.value === "string"
        ? r.value
        : typeof m?.value_text === "string"
        ? m.value_text
        : null;
    const unit = r?.unit ?? m?.unit ?? null;
    const flags = Array.isArray(r?.flags)
      ? r.flags
      : Array.isArray(m?.flags)
      ? m.flags
      : null;
    const file = {
      upload_id:
        r?.source_upload_id ?? r?.upload_id ?? m?.upload_id ?? null,
      bucket: r?.file_bucket ?? m?.bucket ?? null,
      path: r?.file_path ?? m?.storage_path ?? m?.path ?? null,
      name: m?.file_name ?? m?.name ?? null,
      mime: m?.mime ?? null,
    };
    return {
      id: String(r?.id ?? cryptoRandomId()),
      kind,
      name,
      value_num: valueNum,
      value_text: valueText,
      unit,
      flags,
      observed_at: pickObserved(r),
      uploaded_at: iso(r?.created_at ?? r?.createdAt),
      meta: m || {},
      file,
    };
  });

  // Minimal diagnostics to confirm server sees rows
  console.log(
    "[timeline] user:",
    userId,
    "obs:",
    obsRows.length,
    "preds:",
    predRows.length
  );

  // Deduplicate + sort
  const dedup = new Map<string, any>();
  for (const it of [...preds, ...obs]) {
    const key =
      it.file?.upload_id ||
      it.meta?.source_hash ||
      `${it.name}|${it.observed_at}|${"value_num" in it ? it.value_num ?? "" : ""}|${"value_text" in it ? it.value_text ?? "" : ""}`;
    if (!dedup.has(key)) dedup.set(key, it);
  }

  const items = Array.from(dedup.values()).sort(
    (a, b) =>
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  const lang = url.searchParams.get("lang") || "en";
  const translateTimeline = process.env.FORCE_TRANSLATE_TIMELINE !== "false";

  if (translateTimeline && lang && items.length) {
    try {
      const origin = url.origin;

      const names = items.map((it) => String(it?.name ?? "Observation"));
      const summaries = items.map((it) => {
        const m = (it?.meta ?? {}) as any;
        return String(m?.summary ?? m?.text ?? it?.value_text ?? "");
      });

      const [namesRes, sumsRes] = await Promise.all([
        fetch(`${origin}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textBlocks: names, target: lang }),
          cache: "no-store",
        }),
        fetch(`${origin}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textBlocks: summaries, target: lang }),
          cache: "no-store",
        }),
      ]);

      const namesTx = namesRes.ok
        ? ((await namesRes.json())?.blocks as string[]) ?? []
        : [];
      const sumsTx = sumsRes.ok
        ? ((await sumsRes.json())?.blocks as string[]) ?? []
        : [];

      items.forEach((it, i) => {
        const txName =
          typeof namesTx[i] === "string" && namesTx[i].trim()
            ? namesTx[i]
            : it.name;
        const txSum =
          typeof sumsTx[i] === "string" && sumsTx[i].trim()
            ? sumsTx[i]
            : (it.meta ?? {}).summary ?? "";
        it.name_display = txName;
        it.summary_display = txSum;
      });
    } catch (err) {
      console.warn("[timeline] translate failed", err);
    }
  }

  items.forEach((it) => {
    if (typeof it.name_display !== "string" || !it.name_display.trim()) {
      it.name_display = it.name ?? "Observation";
    }
    const meta = (it.meta ?? {}) as any;
    if (typeof it.summary_display !== "string") {
      it.summary_display = meta?.summary ?? "";
    }
  });

  // Always 200 — prevents SWR error loop; you still get console warnings.
  return NextResponse.json({ items }, { headers: noStore });
}

// Tiny helper to ensure an id even if a row lacks one
function cryptoRandomId() {
  // Not crypto-strong in edge runtimes, but fine for a display key fallback
  return Math.random().toString(36).slice(2);
}
