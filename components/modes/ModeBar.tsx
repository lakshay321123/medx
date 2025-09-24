'use client';
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reduce } from "@/lib/modes/modeMachine";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import { useTheme } from "next-themes";
import type { ModeState } from "@/lib/modes/types";
import { createThread } from "@/lib/chatThreads";
import { pushToast } from "@/lib/ui/toast";

export default function ModeBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme } = useTheme();

  const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";

  const state = useMemo(
    () => fromSearchParams(sp, effectiveTheme),
    [sp, effectiveTheme],
  );

  const [therapyBusy, setTherapyBusy] = useState(false);

  // remember last non-aidoc base to exit aidoc gracefully
  const lastNonAidoc = useRef<"patient" | "doctor">("patient");
  useEffect(() => {
    if (state.base !== "aidoc") lastNonAidoc.current = state.base;
  }, [state.base]);

  const lastPatientThread = useRef<string | null>(null);
  useEffect(() => {
    if (state.therapy) return;
    lastPatientThread.current = sp.get("threadId");
  }, [sp, state.therapy]);

  const startTherapy = useCallback(
    async (nextState: ModeState, currentThread: string | null) => {
      if (therapyBusy) return;
      if (currentThread) lastPatientThread.current = currentThread;
      setTherapyBusy(true);
      try {
        const { id } = await createThread({
          title: "Therapy session",
          mode: "patient",
          therapy: true,
        });
        const params = new URLSearchParams(sp.toString());
        params.set("threadId", id);
        params.delete("context");
        router.push(toQuery(nextState, params));
      } catch (err) {
        console.error("Failed to start therapy session", err);
        pushToast({
          title: "Couldn’t start Therapy chat",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        setTherapyBusy(false);
      }
    },
    [router, sp, therapyBusy],
  );

  const exitTherapy = useCallback(
    async (nextState: ModeState) => {
      const params = new URLSearchParams(sp.toString());
      params.delete("therapy");
      params.delete("context");

      const fallback = lastPatientThread.current;
      if (fallback) {
        params.set("threadId", fallback);
        router.push(toQuery(nextState, params));
        return;
      }

      try {
        const { id } = await createThread({
          title: "New chat",
          mode: nextState.base === "doctor" ? "doctor" : "patient",
        });
        params.set("threadId", id);
      } catch (err) {
        console.error("Failed to create fallback chat after therapy", err);
        params.delete("threadId");
      }

      router.push(toQuery(nextState, params));
    },
    [router, sp],
  );

  const apply = (action: Parameters<typeof reduce>[1]) => {
    if (action.type === "toggle/aidoc" && state.base === "aidoc") {
      const q = toQuery(
        { ...state, base: lastNonAidoc.current, therapy: false, research: false },
        sp,
      );
      router.push(q);
      return;
    }

    const next = reduce(state, action);

    if (!state.therapy && next.therapy) {
      if (therapyBusy) return;
      const currentThread = sp.get("threadId");
      void startTherapy(next, currentThread);
      return;
    }

    if (state.therapy && !next.therapy) {
      void exitTherapy(next);
      return;
    }

    router.push(toQuery(next, sp));
  };

  const btn = (active: boolean, disabled?: boolean) =>
    [
      "h-9 rounded-full border px-4 text-sm font-medium transition",
      active
        ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm dark:bg-[#3B82F6] dark:border-[#3B82F6]"
        : "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#2563EB] hover:text-[#2563EB] dark:bg-[#0F1B2D] dark:text-[#94A3B8] dark:border-[#1E3A5F] dark:hover:border-[#3B82F6] dark:hover:text-[#3B82F6]",
      disabled ? "cursor-not-allowed opacity-60" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const aidocOn = state.base === "aidoc";
  const wellnessActive = state.base === "patient" && !state.therapy;
  const doctorActive = state.base === "doctor";

  return (
    <div className="sticky top-[48px] z-30 -mx-3 px-3 py-2 bg-[#F8FAFC]/90 backdrop-blur md:static md:m-0 md:bg-transparent md:px-0 md:py-0 dark:bg-[#0F1B2D]/90">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] md:flex-wrap [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex flex-nowrap items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-2 py-1 backdrop-blur dark:border-[#1E3A5F] dark:bg-[#0F1B2D]">
          <button
            className={btn(wellnessActive)}
            onClick={() => apply({ type: "toggle/patient" })}
          >
            Wellness
          </button>
          <button
            className={btn(state.therapy, aidocOn || state.base !== "patient" || therapyBusy)}
            disabled={aidocOn || state.base !== "patient" || therapyBusy}
            onClick={() => apply({ type: "toggle/therapy" })}
            aria-busy={therapyBusy}
          >
            <span>Therapy</span>
            {therapyBusy && !state.therapy ? (
              <span className="ml-2 inline-flex h-3 w-3 items-center" aria-hidden="true">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </span>
            ) : null}
          </button>
          <button
            className={btn(state.research, aidocOn)}
            disabled={aidocOn}
            onClick={() => apply({ type: "toggle/research" })}
          >
            Research
          </button>
          <button
            className={btn(doctorActive)}
            onClick={() => apply({ type: "toggle/doctor" })}
          >
            Clinical
          </button>

          <div className="mx-1 hidden h-5 w-px bg-black/10 dark:bg-white/10 md:block" />

          <button className={btn(aidocOn)} onClick={() => apply({ type: "toggle/aidoc" })}>
            AI Doc
          </button>
        </div>
      </div>
    </div>
  );
}
