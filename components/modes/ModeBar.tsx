"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { reduce } from "@/lib/modes/modeMachine";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import { useTheme } from "next-themes";
import { createNewThreadId } from "@/lib/chatThreads";

export default function ModeBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme } = useTheme();

  const state = useMemo(
    () => fromSearchParams(sp, (theme as "light"|"dark") ?? "light"),
    [sp, theme]
  );

  // remember last non-aidoc base to exit aidoc gracefully
  const lastNonAidoc = useRef<"patient"|"doctor">("patient");
  useEffect(() => {
    if (state.base !== "aidoc") lastNonAidoc.current = state.base;
  }, [state.base]);

  const lastPatientThread = useRef<string | null>(null);
  useEffect(() => {
    if (state.therapy) return;
    lastPatientThread.current = sp.get("threadId");
  }, [sp, state.therapy]);

  const apply = (action: Parameters<typeof reduce>[1]) => {
    // custom exit for aidoc toggle
    if (action.type === "toggle/aidoc" && state.base === "aidoc") {
      const q = toQuery(
        { ...state, base: lastNonAidoc.current, therapy: false, research: false },
        sp,
      );
      router.push(q);
      return;
    }

    if (action.type === "toggle/therapy") {
      const currentThread = sp.get("threadId");

      if (!state.therapy && state.base === "patient") {
        lastPatientThread.current = currentThread;
        const params = new URLSearchParams(sp.toString());
        params.set("panel", "chat");
        params.set("mode", "patient");
        params.set("therapy", "1");
        params.set("threadId", createNewThreadId());
        params.delete("context");
        router.push(`/?${params.toString()}`);
        return;
      }

      if (state.therapy) {
        const params = new URLSearchParams(sp.toString());
        params.set("panel", "chat");
        params.set("mode", "patient");
        params.delete("therapy");
        params.delete("context");
        const fallback = lastPatientThread.current;
        if (fallback) params.set("threadId", fallback);
        else params.delete("threadId");
        router.push(`/?${params.toString()}`);
        return;
      }
    }

    const next = reduce(state, action);
    if (state.therapy && !next.therapy) {
      const params = new URLSearchParams(sp.toString());
      params.delete("therapy");
      const fallback = lastPatientThread.current;
      if (fallback) params.set("threadId", fallback);
      else params.delete("threadId");
      router.push(toQuery(next, params));
      return;
    }
    router.push(toQuery(next, sp));
  };

  const btn = (active: boolean, disabled?: boolean) =>
    [
      "h-9 rounded-full border px-4 text-sm font-medium transition",
      active
        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
        : "bg-white/70 text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800",
      disabled ? "opacity-60 cursor-not-allowed" : "",
    ].filter(Boolean).join(" ");

  const aidocOn = state.base === "aidoc";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-black/10 bg-white/60 px-2 py-1 backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
      <button
        className={btn(state.base === "patient")}
        onClick={() => apply({ type: "toggle/patient" })}
      >
        Wellness
      </button>
      <button
        className={btn(state.therapy, aidocOn || state.base !== "patient")}
        disabled={aidocOn || state.base !== "patient"}
        onClick={() => apply({ type: "toggle/therapy" })}
      >
        Therapy
      </button>
      <button
        className={btn(state.research, aidocOn)}
        disabled={aidocOn}
        onClick={() => apply({ type: "toggle/research" })}
      >
        Research
      </button>
      <button
        className={btn(state.base === "doctor")}
        onClick={() => apply({ type: "toggle/doctor" })}
      >
        Doctor
      </button>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <button className={btn(aidocOn)} onClick={() => apply({ type: "toggle/aidoc" })}>
        AI Doc
      </button>
    </div>
  );
}
