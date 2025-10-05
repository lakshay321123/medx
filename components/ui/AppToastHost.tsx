"use client";

import { useEffect, useRef, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail } from "@/lib/ui/toast";

type ToastItem = AppToastDetail & { id: number };

export default function AppToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const listener: EventListener = (event) => {
      const detail = (event as CustomEvent<AppToastDetail>).detail;
      if (!detail) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...detail, id }]);
      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 4000);
      timers.current.set(id, timeoutId);
    };

    window.addEventListener(APP_TOAST_EVENT, listener);
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, listener);
      timers.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timers.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="click-through pointer-events-none fixed bottom-6 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map(({ id, title, description, variant }) => {
        const destructive = variant === "destructive";
        const classes = destructive
          ? "pointer-events-auto rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-lg backdrop-blur dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100"
          : "pointer-events-auto rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100";
        return (
          <div key={id} className={classes} role="status" aria-live="polite">
            <div className="font-medium">{title}</div>
            {description ? (
              <div className="mt-1 text-[13px] leading-snug opacity-90">{description}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
