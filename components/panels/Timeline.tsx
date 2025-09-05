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

  useEffect(()=>{
    (async()=>{
      try {
        const res = await fetch("/api/timeline", { cache: "no-store" });
        const { items=[] } = await res.json();
        setItems(items);
      } catch {}
    })();
  },[]);

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

  const filtered = useMemo(()=> (items||[]).filter((it:any)=>{
    if (cat!=="ALL" && catOf(it)!==cat) return false;
    if (fromDate && new Date(it.observed_at) < fromDate) return false;
    if (q.trim()){
      const hay = `${(it.name||"")} ${JSON.stringify(it.meta||{})}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }),[items,cat,fromDate,q]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Timeline</h2>
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
          <li key={`${it.kind}:${it.id}`} className="rounded-xl border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div><span className="font-medium">Test date:</span> {new Date(it.observed_at).toLocaleString()}
              {it.uploaded_at && <> · <span className="font-medium">Uploaded:</span> {new Date(it.uploaded_at).toLocaleString()}</>}</div>
              <div><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{it.kind==="prediction"?"AI":"Obs"}</span></div>
            </div>
            <div className="mt-1 font-medium">
              {it.name}
              {it.kind==="prediction" && typeof it.probability==="number" && <> — {(it.probability*100).toFixed(0)}%</>}
              {it.kind==="observation" && it.value!=null && <> — {String(it.value)}{it.unit?` ${it.unit}`:""}</>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
