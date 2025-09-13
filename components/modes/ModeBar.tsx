"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nextModes } from "@/lib/modes/controller";
import type { ModeState } from "@/lib/modes/types";

const initial: ModeState = { ui: "patient", therapy: false, research: false, aidoc: false, dark: false };

const baseBtn = "px-3.5 py-1.5 rounded-xl text-sm transition active:scale-[.98]";
const ghost =
  "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const active = "bg-blue-600 text-white";

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

  useEffect(() => {
    const aidocActive = params.get("panel") === "ai-doc";
    setS((prev) =>
      prev.aidoc === aidocActive
        ? prev
        : { ...prev, aidoc: aidocActive, ...(aidocActive ? { therapy: false, research: false } : {}) }
    );
  }, [params]);

  useEffect(() => {
    setS((prev) => ({ ...prev, dark: document.documentElement.classList.contains("dark") }));
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    act("dark:set", next === "dark");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* UI mode */}
      <div className="inline-flex rounded-xl border p-1 dark:border-neutral-800">
        <button onClick={() => act("ui:set", "patient")}
          className={`${baseBtn} ${s.ui === "patient" ? active : ghost}`}>Patient</button>
        <button onClick={() => act("ui:set", "doctor")}
          className={`${baseBtn} ${s.ui === "doctor" ? active : ghost}`}>Doctor</button>
      </div>

      {/* Feature modes */}
      <button onClick={() => act("therapy:toggle")}
        className={`${baseBtn} ${s.therapy ? active : ghost}`}>Therapy</button>

      <button onClick={() => act("research:toggle")}
        className={`${baseBtn} ${s.research ? active : ghost}`}>Research</button>

      <button
        onClick={() => {
          const tid = params.get("threadId") ?? `aidoc_${Date.now().toString(36)}`;
          router.push(`/?panel=ai-doc&threadId=${tid}`);
        }}
        className={`${baseBtn} ${s.aidoc ? active : ghost}`}
      >
        AI&nbsp;Doc
      </button>

      <button onClick={toggleTheme}
        className={`${baseBtn} ${s.dark ? active : ghost}`}>{s.dark ? "Light" : "Dark"}</button>
    </div>
  );
}
