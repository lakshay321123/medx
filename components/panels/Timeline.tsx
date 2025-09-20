"use client";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTimeline } from "@/lib/hooks/useAppData";
import { AssistantContent } from "@/components/citations/AssistantContent";
import { normalizeCitations } from "@/lib/normalizeCitations";

type Cat = "ALL"|"LABS"|"VITALS"|"IMAGING"|"AI"|"NOTES";
const catOf = (it:any):Cat => {
  if (it.kind==="prediction") return "AI";
  const s = `${(it.name||"").toLowerCase()} ${JSON.stringify(it.meta||{}).toLowerCase()}`;
  if (/(x-?ray|xray|ct|mri|ultra\s?sound|usg|scan)/.test(s)) return "IMAGING";
  if (/(bp|blood pressure|spo2|bmi|hr|heart rate|pulse)/.test(s)) return "VITALS";
  if (/(hba1c|egfr|fpg|glucose|cholesterol|hdl|ldl|triglycer|creatinine|urea|tsh|t4|t3)/.test(s)) return "LABS";
  if (/(med|tablet|dose|rx|prescription|note)/.test(s)) return "NOTES";
  return "NOTES";
};

export default function Timeline(){
  const [resetError, setResetError] = useState<string|null>(null);
  const { data, error, isLoading, mutate } = useTimeline();
  const items = data?.items ?? [];

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

  const filtered = useMemo(() =>
    (items || []).filter((it: any) => {
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
  [items, cat, fromDate, q]
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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading timeline…</div>;
  if (error)     return <div className="p-6 text-sm text-red-500">Couldn’t load timeline. Retrying in background…</div>;

  if (!items.length) return <div className="p-6 text-sm text-muted-foreground">No events yet.</div>;

  const long = active?.meta?.summary_long;
  const short = active?.meta?.summary;
  const text = active?.meta?.text;

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
        {filtered.map((it:any)=>(
          <li key={`${it.kind}:${it.id}`} className="rounded-xl p-3 cursor-pointer medx-surface text-medx"
              onClick={()=>{ if (it.kind==="observation") { setActive(it); setOpen(true); }}}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div><span className="font-medium">Test date:</span> {new Date(it.observed_at).toLocaleString()}
              {it.uploaded_at && <> · <span className="font-medium">Uploaded:</span> {new Date(it.uploaded_at).toLocaleString()}</>}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{it.kind==="prediction"?"AI":"Obs"}</span>
            </div>
            <div className="mt-1 font-medium">
              {it.name}
              {it.kind==="prediction" && typeof it.probability==="number" && <> — {(it.probability*100).toFixed(0)}%</>}
              {it.kind==="observation" && it.value!=null && <> — {String(it.value)}{it.unit?` ${it.unit}`:""}</>}
            </div>
            {it.meta?.summary && (
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {it.meta.summary}
              </div>
            )}
          </li>
        ))}
      </ul>

      {open && active && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[640px] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl ring-1 ring-black/5 overflow-y-auto">
            <header className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/70 px-4 py-3 flex items-center gap-2">
              <h3 className="font-semibold truncate">{active.name || active.meta?.file_name || "Observation"}</h3>
              <div className="ml-auto flex gap-2">
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <button onClick={() => window.open(signedUrl, '_blank')} className="text-xs px-2 py-1 rounded-md border">Open</button>
                )}
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <a href={signedUrl} download className="text-xs px-2 py-1 rounded-md border">Download</a>
                )}
                {!(active.file?.path || active.file?.upload_id) && (
                  <a href={`/api/observations/${active.id}/export`} className="text-xs px-2 py-1 rounded-md border">Download Summary</a>
                )}
                <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded-md border">Close</button>
              </div>
            </header>
            <div className="px-5 py-4">
              {active.file?.path || active.file?.upload_id ? (
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
                <Tabs defaultValue={long ? 'summary' : (short ? 'summary' : 'text')}>
                  {(long || short) && (
                    <TabsList className="mb-3">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      {text && <TabsTrigger value="text">Full text</TabsTrigger>}
                    </TabsList>
                  )}
                  {(long || short) && (
                    <TabsContent value="summary">
                      <AssistantContent
                        text={(long || short) as string}
                        citations={normalizeCitations(active?.meta)}
                      />
                    </TabsContent>
                  )}
                  {text && (
                    <TabsContent value="text">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-6 select-text">{text}</pre>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
