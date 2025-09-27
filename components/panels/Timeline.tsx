"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTimeline } from "@/lib/hooks/useAppData";
import { useIsAiDocMode } from "@/hooks/useIsAiDocMode";
import PanelLoader from "@/components/mobile/PanelLoader";
import { pushToast } from "@/lib/ui/toast";

const TIMELINE_ALLOWED_KINDS = new Set([
  "medication",
  "note",
  "symptom",
  "lab",
  "imaging",
]);

const normalizeKind = (value: unknown) => String(value ?? "").toLowerCase();

const getDisplayTitle = (ob: any) => {
  const kind = normalizeKind(ob?.kind);
  if (kind === "medication") return ob?.meta?.normalizedName || ob?.value_text || "Medication";
  if (kind === "lab") return ob?.meta?.testName || ob?.meta?.fileTitle || ob?.name || "Lab report";
  if (kind === "imaging") return ob?.meta?.study || ob?.meta?.fileTitle || ob?.name || "Imaging";
  if (kind === "symptom") return "Symptom";
  if (kind === "note") return ob?.meta?.title || "Note";
  return ob?.name || "Observation";
};

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

const getChipLabel = (ob: any) => {
  const kind = normalizeKind(ob?.kind);
  if (kind === "medication") return "Med";
  if (kind === "lab") return "Lab";
  if (kind === "imaging") return "Imaging";
  if (kind === "symptom") return "Symptom";
  if (kind === "note") return "Note";
  return "Obs";
};

const isAllowedObservation = (ob: any) => TIMELINE_ALLOWED_KINDS.has(normalizeKind(ob?.kind));

type Cat = "ALL"|"LABS"|"VITALS"|"IMAGING"|"AI"|"NOTES";
const catOf = (it:any):Cat => {
  const kind = normalizeKind(it?.kind);
  if (kind === "lab") return "LABS";
  if (kind === "imaging") return "IMAGING";
  if (kind === "medication" || kind === "note" || kind === "symptom") return "NOTES";
  if (kind === "prediction") return "AI";
  return "NOTES";
};

export default function Timeline(){
  const isAiDoc = useIsAiDocMode();
  const [resetError, setResetError] = useState<string|null>(null);
  const { data, error, isLoading, mutate } = useTimeline(isAiDoc);
  const items = data?.items ?? [];

  const [observations, setObservations] = useState<any[]>(() =>
    (items || []).filter(isAllowedObservation)
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
    const visible = (items || []).filter(isAllowedObservation);
    setObservations(visible);
  }, [items]);

  const filtered = useMemo(() =>
    (observations || []).filter((it: any) => {
      if (cat !== "ALL" && catOf(it) !== cat) return false;
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

  if (!isAiDoc) return null;

  if (isLoading) return <PanelLoader label="Timeline" />;
  if (error)     return <div className="p-6 text-sm text-red-500">Couldn’t load timeline. Retrying in background…</div>;

  if (!observations.length) return <div className="p-6 text-sm text-muted-foreground">No events yet.</div>;

  const displayTitle = active ? getDisplayTitle(active) : "Observation";
  const shortSummary = active ? getShortSummary(active) : "";
  const summaryLong = active?.meta?.summary_long;
  const summaryShort = active?.meta?.summary;
  const text = active?.meta?.text;
  const hasFile = Boolean(active?.file?.path || active?.file?.upload_id);
  const hasAiSummary = Boolean(summaryLong || summaryShort || text);
  const dose =
    active?.meta?.doseLabel ||
    (active?.value_num != null
      ? `${active.value_num}${active.unit ? ` ${active.unit}` : ""}`
      : null);
  const observed = active?.observed_at
    ? new Date(active.observed_at).toLocaleString()
    : null;
  const source = active?.meta?.source;
  const hasFallbackFacts = Boolean(dose || observed || source || (active?.unit && !dose));
  const chipLabel = active ? getChipLabel(active) : null;

  async function handleDelete(ob: { id: string }) {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this from your timeline?\nThis action can’t be undone.");
      if (!ok) return;
    }

    setIsDeletingId(ob.id);
    const previous = observations;
    setObservations(prev => prev.filter(x => x.id !== ob.id));
    if (active?.id === ob.id) {
      setActive(null);
      setOpen(false);
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <button
          onClick={async () => {
            if (!confirm('Reset all observations and predictions?')) return;
            setResetError(null);
            const res = await fetch('/api/observations/reset', { method: 'POST' });
            if (res.status === 401) { setResetError('Please sign in'); return; }
            await mutate();
          }}
          className="text-xs px-2 py-1 rounded-md border"
        >Reset</button>
      </div>
      {resetError && <div className="mb-2 text-xs text-rose-600">{resetError}</div>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["ALL","LABS","VITALS","IMAGING","AI","NOTES"] as Cat[]).map(c=>(
          <button key={c} onClick={()=>setCat(c)} className={`text-xs px-2.5 py-1 rounded-full border ${cat===c?"bg-muted font-medium":"hover:bg-muted"}`}>{c}</button>
        ))}
        <select value={range} onChange={e=>setRange(e.target.value as any)} className="text-xs border rounded-md px-2 py-1">
          <option value="ALL">All dates</option><option value="7">Last 7d</option>
          <option value="30">Last 30d</option><option value="90">Last 90d</option>
          <option value="CUSTOM">Custom…</option>
        </select>
        {range==="CUSTOM" && <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-xs border rounded-md px-2 py-1" />}
        <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} className="ml-auto text-xs border rounded-md px-2 py-1 min-w-[160px]"/>
      </div>
      <ul className="space-y-2 text-sm">
        {filtered.map((it:any)=>{
          const observedAt = it?.observed_at ? new Date(it.observed_at).toLocaleString() : null;
          const title = getDisplayTitle(it);
          const short = getShortSummary(it);
          const chipLabel = getChipLabel(it);
          return (
            <li
              key={`${it.kind}:${it.id}`}
              className="rounded-xl p-3 cursor-pointer medx-surface text-medx"
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
                    aria-label="Delete observation"
                    title="Delete"
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
        })}
      </ul>

      {open && active && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[640px] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl ring-1 ring-black/5 overflow-y-auto">
            <header className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/70 px-4 py-3 flex items-center gap-2">
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
                  <a href={`/api/observations/${active.id}/export`} className="text-xs px-2 py-1 rounded-md border">Download Summary</a>
                )}
                <button
                  className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
                  aria-label="Delete observation"
                  title="Delete"
                  disabled={isDeletingId === active.id}
                  onClick={() => handleDelete(active)}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded-md border">Close</button>
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
                      {(summaryLong || summaryShort) && (
                        <TabsList className="mb-3">
                          <TabsTrigger value="summary">Summary</TabsTrigger>
                          {text && <TabsTrigger value="text">Full text</TabsTrigger>}
                        </TabsList>
                      )}
                      {(summaryLong || summaryShort) && (
                        <TabsContent value="summary">
                          <article className="prose prose-zinc dark:prose-invert max-w-none whitespace-pre-wrap select-text">
                            {(summaryLong || summaryShort) as string}
                          </article>
                        </TabsContent>
                      )}
                      {text && (
                        <TabsContent value="text">
                          <pre className="whitespace-pre-wrap break-words text-sm leading-6 select-text">{text}</pre>
                        </TabsContent>
                      )}
                    </Tabs>
                  ) : null}
                  {!hasFile && !summaryLong && !summaryShort && !text && (
                    <div className="space-y-3 text-sm">
                      {shortSummary && (
                        <div className="rounded-md border px-3 py-2 leading-6">
                          {shortSummary}
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

                      {active?.value_text && active.value_text !== shortSummary && (
                        <div className="rounded-md border px-3 py-2">
                          {active.value_text}
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
    </div>
  );
}
