"use client";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nextModes } from "@/lib/modes/controller";
import type { ModeState } from "@/lib/modes/types";

const initial: ModeState = { ui: "patient", therapy: false, research: false, aidoc: false, dark: false };

const baseBtn = "px-3.5 py-1.5 rounded-xl text-sm transition active:scale-[.98]";
const ghost =
  "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const solid = "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900";

export default function ModeBar({ onChange }: { onChange?: (s: ModeState)=>void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [s, setS] = useState<ModeState>(initial);
  const promptedRef = useRef<Record<string, number>>({}); // one-time prompts per session

  function act(type: string, value?: any) {
    const { state, prompt } = nextModes(s, { type, value });
    setS(state);
    onChange?.(state);
    if (prompt && !promptedRef.current[prompt]) {
      promptedRef.current[prompt] = Date.now();
      // show toast once
      document.dispatchEvent(new CustomEvent("toast", { detail: { text: prompt } }));
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    act("dark:toggle");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* UI mode */}
      <div className="inline-flex rounded-xl border p-1 dark:border-neutral-800">
        <button onClick={() => act("ui:set", "patient")}
          className={`${baseBtn} ${s.ui === "patient" ? solid : ghost}`}>Patient</button>
        <button onClick={() => act("ui:set", "doctor")}
          className={`${baseBtn} ${s.ui === "doctor" ? solid : ghost}`}>Doctor</button>
      </div>

      {/* Feature modes */}
      <button onClick={() => act("therapy:toggle")}
        className={`${baseBtn} ${s.therapy ? "bg-emerald-600 text-white" : ghost}`}>Therapy</button>

      <button onClick={() => act("research:toggle")}
        className={`${baseBtn} ${s.research ? "bg-blue-600 text-white" : ghost}`}>Research</button>

      <button
        onClick={() => {
          act("aidoc:set", true);
          const tid = params.get("threadId") ?? `aidoc_${Date.now().toString(36)}`;
          router.push(`/?panel=ai-doc&threadId=${tid}`);
        }}
        className={`${baseBtn} ${s.aidoc ? "bg-violet-600 text-white" : ghost}`}
      >
        AI&nbsp;Doc
      </button>

      <button onClick={toggleTheme}
        className={`${baseBtn} ${s.dark ? solid : ghost}`}>Dark</button>
    </div>
  );
}
