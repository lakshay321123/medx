"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsAiDocMode } from "@/hooks/useIsAiDocMode";
import PanelLoader from "@/components/mobile/PanelLoader";
import {
  TimelineCat,
  useTimelineFilterStore,
} from "@/stores/useTimelineFilterStore";

const catOf = (it: any): TimelineCat => {
  if (it.kind === "prediction") return "AI";
  const s = `${(it.name || "").toLowerCase()} ${JSON.stringify(it.meta || {}).toLowerCase()}`;
  if (/(x-?ray|xray|ct|mri|ultra\s?sound|usg|scan)/.test(s)) return "IMAGING";
  if (/(bp|blood pressure|spo2|bmi|hr|heart rate|pulse)/.test(s)) return "VITALS";
  if (/(hba1c|egfr|fpg|glucose|cholesterol|hdl|ldl|triglycer|creatinine|urea|tsh|t4|t3)/.test(s)) return "LABS";
  if (/(med|tablet|dose|rx|prescription|note)/.test(s)) return "NOTES";
  return "NOTES";
};

export default function Timeline() {
  const isAiDoc = useIsAiDocMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();

  const cat = useTimelineFilterStore(state => state.cat);
  const focus = useTimelineFilterStore(state => state.focus);
  const query = useTimelineFilterStore(state => state.query);
  const busy = useTimelineFilterStore(state => state.busy);
  const setCat = useTimelineFilterStore(state => state.setCat);
  const setFocus = useTimelineFilterStore(state => state.setFocus);
  const setQuery = useTimelineFilterStore(state => state.setQuery);
  const start = useTimelineFilterStore(state => state.start);
  const finish = useTimelineFilterStore(state => state.finish);
  const resetAll = useTimelineFilterStore(state => state.resetAll);

  const [range, setRange] = useState<"ALL" | "7" | "30" | "90" | "CUSTOM">("ALL");
  const [from, setFrom] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fromDate = useMemo(() => {
    const now = new Date();
    if (range === "7") return new Date(now.getTime() - 7 * 864e5);
    if (range === "30") return new Date(now.getTime() - 30 * 864e5);
    if (range === "90") return new Date(now.getTime() - 90 * 864e5);
    if (range === "CUSTOM" && from) return new Date(from);
    return undefined;
  }, [range, from]);

  const filtered = useMemo(
    () =>
      (items || []).filter((it: any) => {
        if (cat !== "ALL" && catOf(it) !== cat) return false;
        if (fromDate && new Date(it.observed_at) < fromDate) return false;
        const effectiveQuery = (focus ?? query).trim();
        if (effectiveQuery) {
          const norm = (s: any) =>
            (typeof s === "string" ? s : JSON.stringify(s || {}))
              .normalize("NFKD")
              .replace(/[^\w]+/g, "")
              .toLowerCase();
          const hay = norm([it.name, it.value ?? "", it.unit ?? "", it.meta, it.details].join(" "));
          const needle = norm(effectiveQuery);
          if (!hay.includes(needle)) return false;
        }
        return true;
      }),
    [items, cat, fromDate, focus, query]
  );

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<any | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const nextParams = new URLSearchParams(paramsString);
    const catParam = (nextParams.get("cat") || nextParams.get("category") || "").toUpperCase();
    if (["ALL", "LABS", "VITALS", "IMAGING", "AI", "NOTES"].includes(catParam) && catParam !== cat) {
      setCat(catParam as TimelineCat);
    }

    const focusParam = nextParams.get("focus");
    const queryParam = nextParams.get("query") ?? nextParams.get("q") ?? "";

    if (focusParam) {
      if (focusParam !== focus) {
        setFocus(focusParam);
      }
    } else {
      if (focus) {
        setFocus(null);
      }
      if (queryParam !== query) {
        setQuery(queryParam);
      }
    }
  }, [paramsString, cat, focus, query, setCat, setFocus, setQuery]);

  useEffect(() => {
    if (!isAiDoc) {
      controllerRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    const fetchId = requestIdRef.current + 1;
    requestIdRef.current = fetchId;

    start();
    setFetchError(null);

    const search = new URLSearchParams({ mode: "ai-doc" });
    if (cat && cat !== "ALL") search.set("cat", cat);
    if (focus) {
      search.set("focus", focus);
    } else if (query.trim()) {
      search.set("query", query.trim());
    }

    fetch(`/api/timeline?${search.toString()}`, {
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (controller.signal.aborted || requestIdRef.current !== fetchId) return;
        const nextItems = Array.isArray(json?.items) ? json.items : [];
        setItems(nextItems);
        setInitialLoadComplete(true);
      })
      .catch(err => {
        if (err?.name === "AbortError") return;
        if (requestIdRef.current !== fetchId) return;
        console.error("[timeline] fetch error", err);
        setFetchError(err?.message || "Couldn’t load timeline.");
        setInitialLoadComplete(true);
      })
      .finally(() => {
        if (requestIdRef.current === fetchId) {
          finish();
        }
      });

    return () => {
      controller.abort();
    };
  }, [isAiDoc, cat, focus, query, start, finish]);

  useEffect(() => {
    if (!isAiDoc) return;
    const handle = window.setTimeout(() => {
      const currentParams = paramsString;
      const next = new URLSearchParams(currentParams);
      const hasCat = cat !== "ALL";
      if (hasCat) {
        next.set("cat", cat);
      } else {
        next.delete("cat");
        next.delete("category");
      }

      if (focus) {
        next.set("focus", focus);
        next.delete("query");
        next.delete("q");
      } else if (query.trim()) {
        next.set("query", query.trim());
        next.delete("focus");
        next.delete("q");
      } else {
        next.delete("focus");
        next.delete("query");
        next.delete("q");
      }

      const nextString = next.toString();
      if (nextString !== currentParams) {
        router.replace(nextString ? `?${nextString}` : "?", { scroll: false });
      }
    }, 200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [router, paramsString, cat, focus, query, isAiDoc]);

  useEffect(() => {
    if (!open || !active?.file) {
      setSignedUrl(null);
      return;
    }
    const f = active.file;
    const qs = f.upload_id
      ? `?uploadId=${encodeURIComponent(f.upload_id)}`
      : f.bucket && f.path
      ? `?bucket=${encodeURIComponent(f.bucket)}&path=${encodeURIComponent(f.path)}`
      : "";
    if (!qs) return;
    fetch(`/api/uploads/signed-url${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d?.url) setSignedUrl(d.url);
      });
  }, [open, active]);

  if (!isAiDoc) return null;

  if (!initialLoadComplete && busy) return <PanelLoader label="Timeline" />;

  const showEmpty = !filtered.length && initialLoadComplete && !busy;
  const long = active?.meta?.summary_long;
  const short = active?.meta?.summary;
  const text = active?.meta?.text;

  return (
    <div className="p-4" aria-busy={busy}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <button
          onClick={() => {
            controllerRef.current?.abort();
            setRange("ALL");
            setFrom("");
            setFetchError(null);
            resetAll();
            const currentParams = paramsString;
            const next = new URLSearchParams(currentParams);
            next.delete("cat");
            next.delete("category");
            next.delete("focus");
            next.delete("query");
            next.delete("q");
            const nextString = next.toString();
            if (nextString !== currentParams) {
              router.replace(nextString ? `?${nextString}` : "?", { scroll: false });
            }
          }}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Reset
        </button>
      </div>
      {fetchError && (
        <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/10">
          {fetchError} Filters stay usable; try again shortly.
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["ALL", "LABS", "VITALS", "IMAGING", "AI", "NOTES"] as TimelineCat[]).map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-2.5 py-1 text-xs ${cat === c ? "bg-muted font-medium" : "hover:bg-muted"}`}
          >
            {c}
          </button>
        ))}
        <select
          value={range}
          onChange={event => setRange(event.target.value as any)}
          className="rounded-md border px-2 py-1 text-xs"
        >
          <option value="ALL">All dates</option>
          <option value="7">Last 7d</option>
          <option value="30">Last 30d</option>
          <option value="90">Last 90d</option>
          <option value="CUSTOM">Custom…</option>
        </select>
        {range === "CUSTOM" && (
          <input
            type="date"
            value={from}
            onChange={event => setFrom(event.target.value)}
            className="rounded-md border px-2 py-1 text-xs"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            placeholder="Search…"
            value={focus ?? query}
            onChange={event => setQuery(event.target.value)}
            className="min-w-[160px] rounded-md border px-2 py-1 text-xs"
          />
          {busy && <span className="text-[11px] text-muted-foreground">Loading…</span>}
        </div>
      </div>
      {showEmpty ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No results for the current filters.
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {filtered.map((it: any) => (
            <li
              key={`${it.kind}:${it.id}`}
              className="medx-surface cursor-pointer rounded-xl p-3 text-medx"
              onClick={() => {
                if (it.kind === "observation") {
                  setActive(it);
                  setOpen(true);
                }
              }}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Test date:</span> {new Date(it.observed_at).toLocaleString()}
                  {it.uploaded_at && (
                    <>
                      {" "}·{" "}
                      <span className="font-medium">Uploaded:</span> {new Date(it.uploaded_at).toLocaleString()}
                    </>
                  )}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {it.kind === "prediction" ? "AI" : "Obs"}
                </span>
              </div>
              <div className="mt-1 font-medium">
                {it.name}
                {it.kind === "prediction" && typeof it.probability === "number" && (
                  <> — {(it.probability * 100).toFixed(0)}%</>
                )}
                {it.kind === "observation" && it.value != null && (
                  <> — {String(it.value)}{it.unit ? ` ${it.unit}` : ""}</>
                )}
              </div>
              {it.meta?.summary && (
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.meta.summary}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && active && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div
            className="pointer-events-auto h-full w-full bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="pointer-events-auto fixed right-0 top-0 bottom-0 z-50 w-full max-w-full bg-white text-zinc-900 shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-100 sm:w-[640px]">
            <header className="sticky top-0 flex items-center gap-2 border-b border-zinc-200/70 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900/90">
              <h3 className="truncate font-semibold">{active.name || active.meta?.file_name || "Observation"}</h3>
              <div className="ml-auto flex gap-2">
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <button onClick={() => window.open(signedUrl, "_blank")} className="rounded-md border px-2 py-1 text-xs">
                    Open
                  </button>
                )}
                {(active.file?.path || active.file?.upload_id) && signedUrl && (
                  <a href={signedUrl} download className="rounded-md border px-2 py-1 text-xs">
                    Download
                  </a>
                )}
                {!(active.file?.path || active.file?.upload_id) && (
                  <a href={`/api/observations/${active.id}/export`} className="rounded-md border px-2 py-1 text-xs">
                    Download Summary
                  </a>
                )}
                <button onClick={() => setOpen(false)} className="rounded-md border px-2 py-1 text-xs">
                  Close
                </button>
              </div>
            </header>
            <div className="px-5 py-4">
              {active.file?.path || active.file?.upload_id ? (
                !signedUrl ? (
                  <div className="text-xs text-muted-foreground">Fetching file…</div>
                ) : /\.pdf(\?|$)/i.test(signedUrl) ? (
                  <iframe src={signedUrl} className="h-[80vh] w-full bg-white" />
                ) : /\.(png|jpe?g|gif|webp)(\?|$)/i.test(signedUrl) ? (
                  <img src={signedUrl} className="max-h-[80vh] max-w-full object-contain" />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    Preview unavailable. Use <b>Open</b> or <b>Download</b>.
                  </div>
                )
              ) : (
                <Tabs defaultValue={long ? "summary" : short ? "summary" : "text"}>
                  {(long || short) && (
                    <TabsList className="mb-3">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      {text && <TabsTrigger value="text">Full text</TabsTrigger>}
                    </TabsList>
                  )}
                  {(long || short) && (
                    <TabsContent value="summary">
                      <article className="prose prose-zinc max-w-none select-text whitespace-pre-wrap dark:prose-invert">
                        {(long || short) as string}
                      </article>
                    </TabsContent>
                  )}
                  {text && (
                    <TabsContent value="text">
                      <pre className="whitespace-pre-wrap break-words select-text text-sm leading-6">{text}</pre>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
