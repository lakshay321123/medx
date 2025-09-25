"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import { reduce, type Action } from "@/lib/modes/modeMachine";
import type { ModeState } from "@/lib/modes/types";
import { createThread } from "@/lib/chatThreads";
import { pushToast } from "@/lib/ui/toast";

type ModeChoice = "wellness" | "doctor" | "aidoc" | "therapy";

type Controller = {
  state: ModeState;
  therapyBusy: boolean;
  selectMode: (choice: ModeChoice) => void;
  togglePatient: () => void;
  toggleDoctor: () => void;
  toggleAidoc: () => void;
  toggleTherapy: () => void;
  toggleResearch: () => void;
  toggleTheme: () => void;
  researchEnabled: boolean;
};

export function useModeController(): Controller {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const state = useMemo(
    () => fromSearchParams(searchParams, (theme as "light" | "dark") ?? "light"),
    [searchParams, theme],
  );

  const [therapyBusy, setTherapyBusy] = useState(false);
  const lastNonAidoc = useRef<"patient" | "doctor">("patient");
  useEffect(() => {
    if (state.base !== "aidoc") lastNonAidoc.current = state.base;
  }, [state.base]);

  const lastPatientThread = useRef<string | null>(null);
  useEffect(() => {
    if (state.therapy) return;
    lastPatientThread.current = searchParams.get("threadId");
  }, [state.therapy, searchParams]);

  const startTherapy = useCallback(
    async (nextState: ModeState) => {
      if (therapyBusy) return;
      const currentThread = searchParams.get("threadId");
      if (currentThread) lastPatientThread.current = currentThread;
      setTherapyBusy(true);
      try {
        const { id } = await createThread({
          title: "Therapy session",
          mode: "patient",
          therapy: true,
        });
        const params = new URLSearchParams(searchParams.toString());
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
    [router, searchParams, therapyBusy],
  );

  const exitTherapy = useCallback(
    async (nextState: ModeState) => {
      const params = new URLSearchParams(searchParams.toString());
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
    [router, searchParams],
  );

  const applyAction = useCallback(
    (action: Action) => {
      if (action.type === "toggle/aidoc" && state.base === "aidoc") {
        const params = new URLSearchParams(searchParams.toString());
        const restored = {
          ...state,
          base: lastNonAidoc.current,
          therapy: false,
          research: false,
        } as ModeState;
        router.push(toQuery(restored, params));
        return;
      }

      const next = reduce(state, action);

      if (!state.therapy && next.therapy) {
        void startTherapy(next);
        return;
      }

      if (state.therapy && !next.therapy) {
        void exitTherapy(next);
        return;
      }

      router.push(toQuery(next, searchParams));
    },
    [exitTherapy, router, searchParams, startTherapy, state],
  );

  const togglePatient = useCallback(() => applyAction({ type: "toggle/patient" }), [applyAction]);
  const toggleDoctor = useCallback(() => applyAction({ type: "toggle/doctor" }), [applyAction]);
  const toggleAidoc = useCallback(() => applyAction({ type: "toggle/aidoc" }), [applyAction]);
  const toggleTherapy = useCallback(() => applyAction({ type: "toggle/therapy" }), [applyAction]);
  const toggleResearch = useCallback(() => applyAction({ type: "toggle/research" }), [applyAction]);
  const toggleTheme = useCallback(() => applyAction({ type: "toggle/theme" }), [applyAction]);

  const selectMode = useCallback(
    (choice: ModeChoice) => {
      switch (choice) {
        case "wellness":
          togglePatient();
          break;
        case "doctor":
          toggleDoctor();
          break;
        case "aidoc":
          toggleAidoc();
          break;
        case "therapy":
          if (!state.therapy) toggleTherapy();
          break;
        default:
          break;
      }
    },
    [state.therapy, toggleAidoc, toggleDoctor, togglePatient, toggleTherapy],
  );

  const researchEnabled = !state.therapy && (state.base === "patient" || state.base === "doctor");

  return {
    state,
    therapyBusy,
    selectMode,
    togglePatient,
    toggleDoctor,
    toggleAidoc,
    toggleTherapy,
    toggleResearch,
    toggleTheme,
    researchEnabled,
  };
}
