"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTimeline } from "@/lib/hooks/useAppData";
import { useIsAiDocMode } from "@/hooks/useIsAiDocMode";
import PanelLoader from "@/components/mobile/PanelLoader";
import { pushToast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { useT } from "@/components/hooks/useI18n";

function normalizeKind(k?: string) {
  const raw = String(k ?? "").toLowerCase().trim();
  const squished = raw.replace(/\s+/g, "_");
  const labAliases = ["labs", "lab_report", "report", "document"];
  if (labAliases.includes(raw) || labAliases.includes(squished)) return "lab";

  const imagingAliases = [
    "image",
    "radiology",
    "scan",
    "ct",
    "mri",
    "xray",
    "x-ray",
    "usg",
    "ultrasound",
    "echo",
    "ecg",
    "ekg",
  ];
  if (imagingAliases.includes(raw) || imagingAliases.includes(squished)) return "imaging";

  return raw;
}

function inferImagingTitle(m: any): string | null {
  const hint = String(m?.modality || m?.study || m?.fileTitle || "").toLowerCase();

  if (/\b(ecg|ekg)\b/.test(hint)) return "ECG";
  if (/\b(ct|computed tomography)\b/.test(hint)) return "CT";
  if (/\b(mri|magnetic resonance)\b/.test(hint)) return "MRI";
  if (/\b(x[- ]?ray|xray)\b/.test(hint)) return "X-ray";
  if (/\b(ultrasound|usg|sonography)\b/.test(hint)) return "Ultrasound";
  if (/\b(echo|echocardiogram|echography)\b/.test(hint)) return "Echo";
  if (/\b(angiogram|angiography)\b/.test(hint)) return "Angiogram";
  if (/\b(pet[- ]?ct|pet)\b/.test(hint)) return "PET-CT";

  return null;
}

const EXCLUDED_OBSERVATION_KINDS = new Set([
  "bmi",
  "weight",
  "profile",
  "profile_edit",
  "demographics",
]);

const isMedicalVisible = (ob: any) => {
  const kind = normalizeKind(ob?.kind);
  if (EXCLUDED_OBSERVATION_KINDS.has(kind)) return false;

  if (["medication", "note", "symptom", "lab", "imaging"].includes(kind)) {
    return true;
  }

  const meta = ob?.meta ?? {};
  const category = String(meta?.category ?? "").toLowerCase();
  if (["lab", "labs"].includes(category)) return true;
  if (["imaging", "radiology"].includes(category)) return true;
  if (meta?.testName || meta?.abnormalHint || meta?.impression || meta?.finding) return true;

  const hasFile = Boolean(ob?.file?.path || ob?.file?.upload_id || meta?.fileTitle);
  if (hasFile) return true;

  return false;
};

function getDisplayTitle(ob: any) {
  const kind = normalizeKind(ob?.kind);
  const meta = ob?.meta ?? {};

  if (kind === "lab") {
    return "Blood report";
  }

  if (kind === "imaging") {
    return inferImagingTitle(meta) || "Imaging report";
  }

  if (kind === "medication") {
    return meta?.normalizedName || ob?.value_text || "Medication";
  }

  if (kind === "symptom") return "Symptom";
  if (kind === "note") return meta?.title || "Note";

  return ob?.name || "Observation";
}

const getShortSummary = (ob: any) => {
  const meta = ob?.meta || {};
  const kind = normalizeKind(ob?.kind);
  if (meta?.summary) return meta.summary as string;

  if (kind === "medication") {
    const dose =
      meta?.doseLabel ??
      (ob?.value_num != null ? `${ob.value_num}${ob?.unit ? ` ${ob.unit}` : ""}` : null);
    return [meta?.normalizedName || ob?.value_text, dose].filter(Boolean).join(" — ");
  }

  if (kind === "note" || kind === "symptom") {
    const text = (meta?.text ?? ob?.value_text ?? "") as string;
    const trimmed = text.trim();
    if (!trimmed) return "";
    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  }

  if (kind === "lab") {
    if (meta?.abnormalHint) return meta.abnormalHint as string;
    if (meta?.topFinding) return meta.topFinding as string;
    return meta?.fileTitle || meta?.testName || ob?.value_text || "";
  }

  if (kind === "imaging") {
    return meta?.finding || meta?.impression || meta?.fileTitle || "";
  }

  return (meta?.text as string) || "";
};

const IMPORTANT_FLAG_SET = new Set([
  "important",
  "critical",
  "urgent",
  "high",
  "high_priority",
  "highpriority",
  "priority_high",
  "flagged",
  "needs_attention",
  "alert",
]);

const VITAL_KINDS = new Set([
  "bp",
  "blood_pressure",
  "heart_rate",
  "heartrate",
  "pulse",
  "respiratory_rate",
  "respiratoryrate",
  "temperature",
  "temp",
  "spo2",
  "oxygen_saturation",
  "oxygen",
  "vital",
  "vitals",
]);

type TimelineDetailData = {
  summaryLong: string | null;
  summaryShort: string | null;
  text: string | null;
  valueText: string | null;
  summary: string;
  fullText: string;
  summary_display: string;
  fullText_display: string;
};

const firstNonEmptyString = (...values: any[]): string | null => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const joined = value.join("\n").trim();
      if (joined) return joined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
};

const getChipLabel = (ob: any, translate: (value: string) => string) => {
  const kind = normalizeKind(ob?.kind);
  if (kind === "medication") return translate("Med");
  return translate("Obs");
};

type Cat =
  | "ALL"
  | "MEDICATIONS"
  | "LABS"
  | "SYMPTOMS"
  | "NOTES"
  | "IMPORTANT"
  | "IMAGING"
  | "AI"
  | "VITALS";

const hasImportantSignal = (it: any) => {
  const meta = it?.meta ?? {};
  if (meta?.important === true || meta?.isImportant === true || meta?.highlight === true) {
    return true;
  }

  const priority = String(
    meta?.priority ??
      meta?.importance ??
      meta?.severity ??
      meta?.alert ??
      meta?.signalImportance ??
      "",
  )
    .toLowerCase()
    .replace(/[^a-z_]+/g, "");
  if (priority && IMPORTANT_FLAG_SET.has(priority)) return true;

  const flagsSource = Array.isArray(it?.flags)
    ? it.flags
    : Array.isArray(meta?.flags)
    ? meta.flags
    : null;
  if (Array.isArray(flagsSource)) {
    for (const flag of flagsSource) {
      const norm = String(flag ?? "")
        .toLowerCase()
        .replace(/[^a-z_]+/g, "");
      if (IMPORTANT_FLAG_SET.has(norm)) return true;
    }
  }

  if (meta?.abnormalHint || meta?.alertHint || meta?.topFinding) return true;

  return false;
};

const isVitalObservation = (it: any) => {
  const kind = normalizeKind(it?.kind);
  if (VITAL_KINDS.has(kind)) return true;
  const category = String(it?.meta?.category ?? "").toLowerCase();
  if (category.includes("vital")) return true;
  return false;
};

const matchesCategory = (it: any, cat: Cat) => {
  if (cat === "ALL") return true;
  const kind = normalizeKind(it?.kind);
  const category = String(it?.meta?.category ?? "").toLowerCase();

  if (cat === "MEDICATIONS") return kind === "medication" || category === "medication";
  if (cat === "LABS") return kind === "lab" || category === "lab" || category === "labs";
  if (cat === "SYMPTOMS") return kind === "symptom" || category === "symptom";
  if (cat === "NOTES") return kind === "note" || category === "note";
  if (cat === "IMPORTANT") return hasImportantSignal(it);
  if (cat === "IMAGING")
    return (
      kind === "imaging" ||
      category === "imaging" ||
      category === "radiology" ||
      category === "image"
    );
  if (cat === "AI")
    return (
      kind === "prediction" ||
      kind === "ai_extract" ||
      category === "prediction" ||
      category === "ai"
    );
  if (cat === "VITALS") return isVitalObservation(it);

  return false;
};

export default function Timeline(){
  const isAiDoc = useIsAiDocMode();
  const t = useT();
  const lang = t.lang;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [lang],
  );
  const formatDateTime = useCallback(
    (value: string | number | Date | null | undefined) => {
      if (!value) return null;
      const dt =
        typeof value === "string" || typeof value === "number"
          ? new Date(value)
          : value;
      if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
      return dateFormatter.format(dt);
    },
    [dateFormatter],
  );
  const catOptions = useMemo<{ id: Cat; label: string }[]>(
    () => [
      { id: "ALL", label: t("All") },
      { id: "MEDICATIONS", label: t("Medications") },
      { id: "LABS", label: t("Labs") },
      { id: "SYMPTOMS", label: t("Symptoms") },
      { id: "NOTES", label: t("Notes") },
      { id: "IMPORTANT", label: t("Important signals") },
      { id: "IMAGING", label: t("Imaging") },
      { id: "AI", label: t("AI Extracts") },
      { id: "VITALS", label: t("Vitals") },
    ],
    [t],
  );
  const [resetError, setResetError] = useState<string|null>(null);
  const { data, error, isLoading, mutate } = useTimeline(isAiDoc, lang);
  const items = data?.items ?? [];

  const [observations, setObservations] = useState<any[]>(() =>
    (items || []).filter(isMedicalVisible)
  );
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [cat,setCat] = useState<Cat>("ALL");
  const [range,setRange] = useState<"ALL"|"7"|"30"|"90"|"CUSTOM">("ALL");
  const [from,setFrom] = useState<string>("");
  const [q,setQ] = useState("");

  const fromDate = useMemo(()=>{
    const now=new Date();
    if (range==="7") return new Date(now.getTime()-7*864e5);
    if (range==="30") return new Date(now.getTime()-30*864e5);
    if (range==="90") return new Date(now.getTime()-90*864e5);
    if (range==="CUSTOM" && from) return new Date(from);
    return undefined;
  },[range,from]);

  useEffect(() => {
    const visible = (items || []).filter(isMedicalVisible);
    setObservations(visible);
  }, [items]);

  const filtered = useMemo(() =>
    (observations || []).filter((it: any) => {
      if (!matchesCategory(it, cat)) return false;
      if (fromDate && new Date(it.observed_at) < fromDate) return false;
      if (q.trim()) {
        const norm = (s: any) =>
          (typeof s === "string" ? s : JSON.stringify(s || {}))
            .normalize("NFKD")
            .replace(/[^\w]+/g, "")
            .toLowerCase();
        const hay = norm([it.name, it.value ?? "", it.unit ?? "", it.meta, it.details].join(" "));
        const needle = norm(q.trim());
        if (!hay.includes(needle)) return false;
      }
      return true;
    }),
  [observations, cat, fromDate, q]
  );

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<any|null>(null);
  const [signedUrl, setSignedUrl] = useState<string|null>(null);
  const detailCacheRef = useRef<Map<string, TimelineDetailData>>(new Map());
  const [detailData, setDetailData] = useState<TimelineDetailData | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const overlayHistoryRef = useRef(false);
  const overlayPopActiveRef = useRef(false);
  const router = useRouter();

  const closeOverlay = useCallback((options?: { skipHistory?: boolean }) => {
    const hadHistoryEntry = overlayHistoryRef.current;
    overlayHistoryRef.current = false;
    setOpen(false);
    setActive(null);
    setSignedUrl(null);
    if (!options?.skipHistory && hadHistoryEntry && typeof window !== "undefined") {
      overlayPopActiveRef.current = true;
      window.history.back();
      setTimeout(() => {
        overlayPopActiveRef.current = false;
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) return;

    const handlePopState = () => {
      if (!overlayHistoryRef.current) return;
      overlayPopActiveRef.current = true;
      closeOverlay({ skipHistory: true });
      setTimeout(() => {
        overlayPopActiveRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", handlePopState);
    window.history.pushState({ timelineOverlay: true }, "");
    overlayHistoryRef.current = true;

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, closeOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRootPopState = () => {
      if (overlayHistoryRef.current || overlayPopActiveRef.current) return;
      router.replace("/?panel=chat");
    };

    window.addEventListener("popstate", handleRootPopState);
    return () => {
      window.removeEventListener("popstate", handleRootPopState);
    };
  }, [router]);
  useEffect(()=>{
    if (!open || !active?.file) { setSignedUrl(null); return; }
    const f = active.file;
    const qs = f.upload_id
      ? `?uploadId=${encodeURIComponent(f.upload_id)}`
      : f.bucket && f.path
      ? `?bucket=${encodeURIComponent(f.bucket)}&path=${encodeURIComponent(f.path)}`
      : "";
    if (!qs) return;
    fetch(`/api/uploads/signed-url${qs}`).then(r=>r.json()).then(d=>{ if (d?.url) setSignedUrl(d.url); });
  }, [open, active]);

  useEffect(() => {
    setShowOriginal(false);
    if (!open || !active) {
      setDetailData(null);
      return;
    }
    if (!active.id) return;

    const meta = active?.meta ?? {};
    const baseSummaryLong = firstNonEmptyString(meta.summary_long, meta.summaryLong);
    const baseSummaryShort = firstNonEmptyString(meta.summary, meta.summaryShort);
    const baseText = firstNonEmptyString(meta.text);
    const baseValueText = firstNonEmptyString(active?.value_text, meta.value_text);

    const fallbackSummary =
      baseSummaryLong ??
      baseSummaryShort ??
      baseValueText ??
      baseText ??
      "";
    const fallbackFull = baseText ?? baseValueText ?? "";

    const fallbackDetail: TimelineDetailData = {
      summaryLong: baseSummaryLong ?? null,
      summaryShort: baseSummaryShort ?? null,
      text: baseText ?? null,
      valueText: baseValueText ?? null,
      summary: fallbackSummary,
      fullText: fallbackFull,
      summary_display: fallbackSummary,
      fullText_display: fallbackFull,
    };

    setDetailData(fallbackDetail);

    const englishSnapshot = JSON.stringify({
      summary: fallbackSummary,
      fullText: fallbackFull,
    });
    const cacheKey = `${active.id}:${lang}:${englishSnapshot}`;
    const cached = detailCacheRef.current.get(cacheKey);
    if (cached) {
      setDetailData(cached);
      return;
    }

    const url = `/api/timeline/summary?id=${encodeURIComponent(active.id)}&lang=${encodeURIComponent(lang)}`;
    let cancelled = false;

    fetch(url, { cache: "no-store" })
      .then(res => (res.ok ? res.json() : null))
      .then(payload => {
        if (cancelled || !payload?.ok || !payload?.data) return;
        const remote = payload.data as any;
        const next: TimelineDetailData = {
          summaryLong: firstNonEmptyString(remote.summaryLong, baseSummaryLong) ?? null,
          summaryShort: firstNonEmptyString(remote.summaryShort, baseSummaryShort) ?? null,
          text: firstNonEmptyString(remote.text, baseText) ?? null,
          valueText: firstNonEmptyString(remote.valueText, baseValueText) ?? null,
          summary:
            typeof remote.summary === "string" && remote.summary.length > 0
              ? remote.summary
              : fallbackSummary,
          fullText:
            typeof remote.fullText === "string" && remote.fullText.length > 0
              ? remote.fullText
              : fallbackFull,
          summary_display:
            typeof remote.summary_display === "string" && remote.summary_display.trim()
              ? remote.summary_display
              : typeof remote.summary === "string" && remote.summary.trim()
              ? remote.summary
              : fallbackSummary,
          fullText_display:
            typeof remote.fullText_display === "string" && remote.fullText_display.trim()
              ? remote.fullText_display
              : typeof remote.fullText === "string" && remote.fullText.trim()
              ? remote.fullText
              : fallbackFull,
        };
        detailCacheRef.current.set(cacheKey, next);
        setDetailData(next);
      })
      .catch(() => {
        if (!cancelled) {
          detailCacheRef.current.delete(cacheKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, active, lang]);

  if (!isAiDoc) return null;

  if (isLoading) return <PanelLoader label={t("Timeline")} />;
  if (error)
    return (
      <div className="p-6 text-sm text-red-500">{t("Couldn’t load timeline. Retrying…")}</div>
    );

  if (!observations.length)
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("No events yet.")}</div>
    );

  const displayTitle = active ? getDisplayTitle(active) : "Observation";
  const originalShortSummary = active ? getShortSummary(active) : "";
  const metaForActive = active?.meta ?? {};
  const summaryLong = firstNonEmptyString(detailData?.summaryLong, metaForActive.summary_long, metaForActive.summaryLong);
  const summaryShort = firstNonEmptyString(detailData?.summaryShort, metaForActive.summary, metaForActive.summaryShort);
  const text = firstNonEmptyString(detailData?.text, metaForActive.text);
  const hasFile = Boolean(active?.file?.path || active?.file?.upload_id);
  const hasAiSummary = Boolean(
    (summaryLong && summaryLong.trim()) ||
      (summaryShort && summaryShort.trim()) ||
      (text && text.trim()),
  );
  const dose =
    active?.meta?.doseLabel ||
    (active?.value_num != null
      ? `${active.value_num}${active.unit ? ` ${active.unit}` : ""}`
      : null);
  const observed = formatDateTime(active?.observed_at);
  const source = active?.meta?.source;
  const hasFallbackFacts = Boolean(dose || observed || source || (active?.unit && !dose));
  const chipLabel = active ? getChipLabel(active, t) : null;
  const summaryOriginalContent = detailData?.summary ?? summaryLong ?? summaryShort ?? "";
  const summaryTranslatedContent = detailData?.summary_display ?? summaryOriginalContent;
  const fullTextOriginal = detailData?.fullText ?? text ?? firstNonEmptyString(active?.value_text, metaForActive.value_text) ?? "";
  const fullTextTranslated = detailData?.fullText_display ?? fullTextOriginal;
  const trimmedSummaryOriginal = summaryOriginalContent.trim();
  const trimmedSummaryTranslated = summaryTranslatedContent.trim();
  const trimmedFullOriginal = fullTextOriginal.trim();
  const trimmedFullTranslated = fullTextTranslated.trim();
  const hasTranslatedContent =
    lang !== "en" &&
    detailData != null &&
    ((trimmedSummaryTranslated && trimmedSummaryTranslated !== trimmedSummaryOriginal) ||
      (trimmedFullTranslated && trimmedFullTranslated !== trimmedFullOriginal));
  const displaySummaryLong = showOriginal ? summaryOriginalContent : summaryTranslatedContent;
  const displaySummaryShort = showOriginal ? summaryOriginalContent : summaryTranslatedContent;
  const displayText = showOriginal ? fullTextOriginal : fullTextTranslated;
  const displayShortSummary = showOriginal
    ? originalShortSummary
    : active?.summary_display ?? originalShortSummary;
  const displayValueText = active?.value_text ?? "";
  const summaryAvailable = Boolean((showOriginal ? trimmedSummaryOriginal : trimmedSummaryTranslated) || trimmedSummaryOriginal);
  const textAvailable = Boolean((showOriginal ? trimmedFullOriginal : trimmedFullTranslated) || trimmedFullOriginal);
  const translationToggleLabel = showOriginal
    ? t("Show translation")
    : t("Show original");

  async function handleDelete(ob: { id: string }) {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this from your timeline?\nThis action can’t be undone.");
      if (!ok) return;
    }

    setIsDeletingId(ob.id);
    const previous = observations;
    setObservations(prev => prev.filter(x => x.id !== ob.id));
    if (active?.id === ob.id) {
      closeOverlay();
    }

    try {
      const res = await fetch(`/api/observations/${ob.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      pushToast({ title: "Deleted" });
    } catch (err) {
      setObservations(previous);
      await mutate();
      pushToast({
        title: "Couldn't delete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <>
      <div className="-mx-6 sm:mx-0">
        <div className="mx-auto w-full max-w-[380px] overflow-x-hidden px-4 pb-6 pt-4 sm:mx-0 sm:max-w-none sm:overflow-visible sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
            <h2 className="text-lg font-semibold">{t("Timeline")}</h2>
            <button
              onClick={async () => {
                if (!confirm('Reset all observations and predictions?')) return;
                setResetError(null);
                const res = await fetch('/api/observations/reset', { method: 'POST' });
                if (res.status === 401) { setResetError('Please sign in'); return; }
                await mutate();
              }}
              className="text-xs px-2 py-1 rounded-md border sm:ml-auto"
            >{t("Reset")}</button>
          </div>
          {resetError && <div className="mb-2 text-xs text-rose-600">{resetError}</div>}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="flex flex-wrap justify-center gap-2 sm:flex-auto sm:justify-start">
              {catOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setCat(option.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    cat === option.id ? "bg-muted font-medium" : "hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <select value={range} onChange={e=>setRange(e.target.value as any)} className="w-full rounded-md border px-2 py-1 text-xs sm:w-auto">
                  <option value="ALL">{t("All dates")}</option>
                  <option value="7">{t("Last 7d")}</option>
                  <option value="30">{t("Last 30d")}</option>
                  <option value="90">{t("Last 90d")}</option>
                  <option value="CUSTOM">{t("Custom…")}</option>
                </select>
                {range==="CUSTOM" && <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border px-2 py-1 text-xs sm:w-auto" />}
              </div>
              <input
                placeholder={t("Search…")}
                value={q}
                onChange={e=>setQ(e.target.value)}
                className="w-full min-w-0 rounded-md border px-2 py-1 text-xs sm:ml-auto sm:w-[200px]"
              />
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {filtered.length === 0 ? (
              <li className="rounded-xl p-4 text-center text-xs text-muted-foreground">
                {t("No results for this filter.")}
              </li>
            ) : (
              filtered.map((it:any)=>{
                const observedAt = formatDateTime(it?.observed_at);
                const title = it?.name_display ?? it?.name ?? t("Observation");
                const short = it?.summary_display ?? getShortSummary(it);
                const chipLabel = getChipLabel(it, t);
                return (
                  <li
                    key={`${it.kind}:${it.id}`}
                    className="w-full rounded-xl p-3 cursor-pointer medx-surface text-medx"
                    onClick={() => {
                      setActive(it);
                      setOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {observedAt && (
                          <div className="text-xs text-muted-foreground">
                            {observedAt}
                          </div>
                        )}
                        <div className="mt-1 font-medium truncate">
                          {title}
                        </div>
                        {short && (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {short}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-1">
                        {chipLabel && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted whitespace-nowrap">
                            {chipLabel}
                          </span>
                        )}
                        <button
                          className="shrink-0 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
                          aria-label={t("Delete")}
                          title={t("Delete")}
                          disabled={isDeletingId === it.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(it);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {open && active && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => closeOverlay()} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[640px] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl ring-1 ring-black/5 overflow-y-auto">
            <header className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/70 px-4 py-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => closeOverlay()}
                className="sm:hidden -ml-1 rounded-md p-2 hover:bg-slate-100 dark:hover:bg-gray-800"
                aria-label="Close details"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="font-semibold truncate flex items-center gap-2">
                <span>{displayTitle}</span>
                {chipLabel && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {chipLabel}
                  </span>
                )}
              </h3>
              <div className="ml-auto flex gap-2">
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <button onClick={() => window.open(signedUrl, '_blank')} className="text-xs px-2 py-1 rounded-md border">Open</button>
                )}
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <a href={signedUrl} download className="text-xs px-2 py-1 rounded-md border">Download</a>
                )}
                {!hasFile && hasAiSummary && (
                  <a
                    href={`/api/observations/${active.id}/export`}
                    className="text-xs px-2 py-1 rounded-md border"
                  >
                    {t("Download Summary")}
                  </a>
                )}
                <button
                  className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
                  aria-label={t("Delete")}
                  title={t("Delete")}
                  disabled={isDeletingId === active.id}
                  onClick={() => handleDelete(active)}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => closeOverlay()}
                  className="hidden sm:inline-flex text-xs px-2 py-1 rounded-md border"
                >
                  {t("Close")}
                </button>
              </div>
            </header>
            <div className="px-5 py-4">
              {hasFile ? (
                !signedUrl ? (
                  <div className="text-xs text-muted-foreground">Fetching file…</div>
                ) : /\.pdf(\?|$)/i.test(signedUrl) ? (
                  <iframe src={signedUrl} className="w-full h-[80vh] bg-white" />
                ) : /\.(png|jpe?g|gif|webp)(\?|$)/i.test(signedUrl) ? (
                  <img src={signedUrl} className="max-w-full max-h-[80vh] object-contain" />
                ) : (
                  <div className="text-sm text-muted-foreground text-center">Preview unavailable. Use <b>Open</b> or <b>Download</b>.</div>
                )
              ) : (
                <>
                  {(summaryLong || summaryShort || text) ? (
                    <Tabs defaultValue={summaryLong ? 'summary' : (summaryShort ? 'summary' : 'text')}>
                      {(summaryAvailable || hasTranslatedContent) && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {summaryAvailable && (
                            <TabsList className="mx-0 flex-1 justify-start sm:flex-none">
                              <TabsTrigger value="summary">{t("Summary")}</TabsTrigger>
                              {textAvailable && (
                                <TabsTrigger value="text">{t("Full text")}</TabsTrigger>
                              )}
                            </TabsList>
                          )}
                          <div
                            className={`ml-auto flex items-center gap-2 ${
                              summaryAvailable ? '' : 'w-full justify-end'
                            }`}
                          >
                            {hasTranslatedContent && (
                              <button
                                type="button"
                                onClick={() => setShowOriginal(prev => !prev)}
                                className="text-xs underline"
                              >
                                {translationToggleLabel}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => closeOverlay()}
                              className="sm:hidden inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-1 text-xs"
                            >
                              {t("Close")}
                            </button>
                          </div>
                        </div>
                      )}
                      {summaryAvailable && (
                        <TabsContent value="summary">
                          <article className="prose prose-zinc dark:prose-invert max-w-none whitespace-pre-wrap select-text">
                            {displaySummaryLong || displaySummaryShort || ""}
                          </article>
                        </TabsContent>
                      )}
                      {textAvailable && (
                        <TabsContent value="text">
                          <pre className="whitespace-pre-wrap break-words text-sm leading-6 select-text">
                            {displayText || ""}
                          </pre>
                        </TabsContent>
                      )}
                    </Tabs>
                  ) : null}
                  {!hasFile && !summaryLong && !summaryShort && !text && (
                    <div className="space-y-3 text-sm">
                      {hasTranslatedContent && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowOriginal(prev => !prev)}
                            className="text-xs underline"
                          >
                            {translationToggleLabel}
                          </button>
                        </div>
                      )}
                      {displayShortSummary && (
                        <div className="rounded-md border px-3 py-2 leading-6">
                          {displayShortSummary}
                        </div>
                      )}

                      {hasFallbackFacts && (
                        <div className="grid grid-cols-2 gap-2">
                          {dose && (
                            <div className="rounded-md border px-2 py-1">
                              <div className="text-[11px] uppercase opacity-70">Dose</div>
                              <div>{dose}</div>
                            </div>
                          )}
                          {observed && (
                            <div className="rounded-md border px-2 py-1">
                              <div className="text-[11px] uppercase opacity-70">Observed</div>
                              <div>{observed}</div>
                            </div>
                          )}
                          {source && (
                            <div className="rounded-md border px-2 py-1">
                              <div className="text-[11px] uppercase opacity-70">Source</div>
                              <div className="capitalize">{String(source)}</div>
                            </div>
                          )}
                          {active?.unit && !dose && (
                            <div className="rounded-md border px-2 py-1">
                              <div className="text-[11px] uppercase opacity-70">Unit</div>
                              <div>{active.unit}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {active?.value_text && active.value_text !== originalShortSummary && (
                        <div className="rounded-md border px-3 py-2">
                          {displayValueText}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
