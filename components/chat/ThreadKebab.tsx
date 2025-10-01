"use client";
import { useT } from "@/components/hooks/useI18n";
import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { renameThread, deleteThread } from "@/lib/chatThreads";
import { useRouter } from "next/navigation";

export default function ThreadKebab({ id, title, onRenamed, onDeleted }: {
  id: string; title: string;
  onRenamed?: (newTitle: string)=>void;
  onDeleted?: ()=>void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [askRename, setAskRename] = useState(false);
  const [name, setName] = useState(title);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const computeMenuStyle = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const right = Math.max(window.innerWidth - rect.right, 0);
    const top = rect.bottom + 4; // match previous mt-1 spacing
    const style: CSSProperties = {
      position: "fixed",
      top,
      right,
      zIndex: 12010,
    };
    return style;
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const style = computeMenuStyle();
    if (style) setMenuStyle(style);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const style = computeMenuStyle();
      if (style) setMenuStyle(style);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen(s => !s)}
        aria-label={t("Thread options")}
        title={t("Options")}
      >
        ⋯
      </button>

      {open && portalReady && menuStyle &&
        createPortal(
          <div
            ref={node => { menuRef.current = node; }}
            className="w-44 rounded-md border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            style={menuStyle}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => { setAskRename(true); setOpen(false); }}
            >
              {t("Rename")}
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={() => {
                setOpen(false);
                if (confirm(t("Delete this chat? This cannot be undone."))) {
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
              {t("Delete")}
            </button>
          </div>,
          document.body,
        )}

      {/* Rename dialog (lightweight inline) */}
      {askRename && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setAskRename(false)} />
          <div className="relative w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 p-4">
            <div className="text-sm font-medium mb-2">{t("Rename chat")}</div>
            <input
              autoFocus
              value={name}
              onChange={e=>setName(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1.5 text-sm rounded border"
                onClick={()=>setAskRename(false)}>{t("Cancel")}</button>
              <button
                className="px-3 py-1.5 text-sm rounded border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50"
                onClick={()=>{
                  const nn = name.trim() || t("Untitled");
                  renameThread(id, nn);
                  onRenamed?.(nn);
                  setAskRename(false);
                }}
              >
                {t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
