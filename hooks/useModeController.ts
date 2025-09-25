"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { reduce } from "@/lib/modes/modeMachine";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import type { ModeState } from "@/lib/modes/types";
import { createThread } from "@/lib/chatThreads";
import { pushToast } from "@/lib/ui/toast";

export type ModeAction = Parameters<typeof reduce>[1];

export type ModeController = {
  state: ModeState;
  apply: (action: ModeAction) => void;
  therapyBusy: boolean;
  isAidoc: boolean;
  lastNonAidoc: "patient" | "doctor";
};

export function useModeController(): ModeController {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme } = useTheme();

  const state = useMemo(
    () => fromSearchParams(sp, (theme as "light" | "dark") ?? "light"),
    [sp, theme],
  );

  const [therapyBusy, setTherapyBusy] = useState(false);

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

  const apply = useCallback(
    (action: ModeAction) => {
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
    },
    [exitTherapy, router, sp, startTherapy, state, therapyBusy],
  );

  return {
    state,
    apply,
    therapyBusy,
    isAidoc: state.base === "aidoc",
    lastNonAidoc: lastNonAidoc.current,
  };
}
