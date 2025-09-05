"use client";
import { useEffect, useMemo, useState } from "react";

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
  const [items, setItems] = useState<any[]>([]);
  const [resetError, setResetError] = useState<string|null>(null);

  const refresh = async () => {
    try {
      const res = await fetch('/api/timeline', { cache: 'no-store' });
      const { items = [] } = await res.json();
      setItems(items);
    } catch {}
  };

  useEffect(()=>{ refresh(); },[]);

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
  const [drawerReady, setDrawerReady] = useState(false);
  useEffect(()=>{ if (open) setTimeout(()=>setDrawerReady(true),10); else setDrawerReady(false); },[open]);
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
            refresh();
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
          <li key={`${it.kind}:${it.id}`} className="rounded-xl border p-3 hover:bg-muted/40 cursor-pointer"
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
          </li>
        ))}
      </ul>

      {open && active && (
        <div className={`fixed inset-0 bg-black/40 z-50 ${drawerReady?'':'pointer-events-none'}`} onClick={()=>setOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-background shadow-xl p-4 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-medium truncate">{active.name || active.meta?.file_name || "Report"}</div>
              <div className="flex gap-2">
                {(active.file?.path || active.file?.upload_id) && signedUrl && <button onClick={()=>window.open(signedUrl, "_blank")} className="text-xs px-2 py-1 rounded-md border">Open</button>}
                {(active.file?.path || active.file?.upload_id) && signedUrl && <a href={signedUrl} download className="text-xs px-2 py-1 rounded-md border">Download</a>}
                {!(active.file?.path || active.file?.upload_id) && <a href={`/api/observations/${active.id}/export`} className="text-xs px-2 py-1 rounded-md border">Download Summary</a>}
                <button onClick={()=>setOpen(false)} className="text-xs px-2 py-1 rounded-md border">Close</button>
              </div>
            </div>
            <div className="mt-3 h-[calc(100%-56px)] overflow-auto rounded-lg border bg-muted/10 flex items-center justify-center p-4 text-sm whitespace-pre-wrap">
              {active.file?.path || active.file?.upload_id ? (
                !signedUrl ? (
                  <div className="text-xs text-muted-foreground">Fetching file…</div>
                ) : /\.pdf(\?|$)/i.test(signedUrl) ? (
                  <iframe src={signedUrl} className="w-full h-full rounded-lg" />
                ) : /\.(png|jpe?g|gif|webp)(\?|$)/i.test(signedUrl) ? (
                  <img src={signedUrl} className="max-w-full max-h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-sm text-muted-foreground text-center">Preview unavailable. Use <b>Open</b> or <b>Download</b>.</div>
                )
              ) : (
                <div className="w-full">
                  {active.meta?.summary && <p className="mb-2">{active.meta.summary}</p>}
                  {active.meta?.patient_fields && (
                    <div className="mb-2 text-xs text-muted-foreground">
                      {Object.entries(active.meta.patient_fields).map(([k,v]) => v ? <div key={k}>{k}: {String(v)}</div> : null)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
