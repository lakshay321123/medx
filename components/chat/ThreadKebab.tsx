"use client";
import { useState, useRef, useEffect } from "react";
import { renameThread, deleteThread } from "@/lib/chatThreads";
import { useRouter } from "next/navigation";

export default function ThreadKebab({ id, title, onRenamed, onDeleted }: {
  id: string; title: string;
  onRenamed?: (newTitle: string)=>void;
  onDeleted?: ()=>void;
}) {
  const [open, setOpen] = useState(false);
  const [askRename, setAskRename] = useState(false);
  const [name, setName] = useState(title);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen(s => !s)}
        aria-label="Thread options"
        title="Options"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-md border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg z-20">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => { setAskRename(true); setOpen(false); }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            onClick={() => {
              setOpen(false);
              if (confirm("Delete this chat? This cannot be undone.")) {
                deleteThread(id);
                onDeleted?.();
                // if currently on this thread route, send to home
                try {
                  const url = new URL(window.location.href);
                  if (url.searchParams.get("threadId") === id) {
                    url.searchParams.delete("threadId");
                    router.push(url.pathname + (url.search ? url.search : ""));
                  }
                } catch {}
              }
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Rename dialog (lightweight inline) */}
      {askRename && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-overlay/40" onClick={()=>setAskRename(false)} />
          <div className="relative w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 p-4">
            <div className="text-sm font-medium mb-2">Rename chat</div>
            <input
              autoFocus
              value={name}
              onChange={e=>setName(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1.5 text-sm rounded border"
                onClick={()=>setAskRename(false)}>Cancel</button>
              <button
                className="px-3 py-1.5 text-sm rounded border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50"
                onClick={()=>{
                  const nn = name.trim() || "Untitled";
                  renameThread(id, nn);
                  onRenamed?.(nn);
                  setAskRename(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
