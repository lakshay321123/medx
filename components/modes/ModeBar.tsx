"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nextModes } from "@/lib/modes/controller";
import type { ModeState } from "@/lib/modes/types";

const baseBtn = "px-3.5 py-1.5 rounded-xl text-sm transition active:scale-[.98]";
const ghost = "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const active = "bg-blue-600 text-white";

const initial: ModeState = { ui: undefined, therapy: false, research: false, aidoc: false, dark: false };

export default function ModeBar({ onChange }: { onChange?: (s: ModeState) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ModeState>(initial);
  const [isDark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  const promptedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const panel = (searchParams.get("panel") ?? "chat").toLowerCase();
    act("aidoc:set", panel === "ai-doc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function act(type: string, value?: any) {
    const { state: s, prompt } = nextModes(state, { type, value });
    setState(s);
    onChange?.(s);
    if (prompt && !promptedRef.current[prompt]) {
      promptedRef.current[prompt] = Date.now();
      document.dispatchEvent(new CustomEvent("toast", { detail: { text: prompt } }));
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setDark(next === "dark");
    act("dark:set", next === "dark");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={`${baseBtn} ${state.ui === "patient" ? active : ghost}`}
        onClick={() => act("ui:set", "patient")}
      >
        Patient
      </button>
      <button
        className={`${baseBtn} ${state.ui === "doctor" ? active : ghost}`}
        onClick={() => act("ui:set", "doctor")}
      >
        Doctor
      </button>
      <button
        className={`${baseBtn} ${state.therapy ? active : ghost}`}
        onClick={() => act("therapy:toggle")}
      >
        Therapy
      </button>
      <button
        className={`${baseBtn} ${state.research ? active : ghost}`}
        onClick={() => act("research:toggle")}
      >
        Research
      </button>
      <button
        className={`${baseBtn} ${state.aidoc ? active : ghost}`}
        onClick={() => {
          act("aidoc:set", true);
          router.push("/?panel=ai-doc");
        }}
      >
        AI Doc
      </button>
      <button
        className={`${baseBtn} ${isDark ? active : ghost}`}
        onClick={toggleTheme}
      >
        {isDark ? "Light" : "Dark"}
      </button>
    </div>
  );
}
