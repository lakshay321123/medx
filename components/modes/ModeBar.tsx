"use client";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { nextModes } from "@/lib/modes/controller";
import type { ModeState } from "@/lib/modes/types";

const initial: ModeState = { ui: undefined, therapy: false, research: false, aidoc: false, dark: false };

export default function ModeBar({ onChange }: { onChange?: (s: ModeState)=>void }) {
  const [s, setS] = useState<ModeState>(initial);
  const promptedRef = useRef<Record<string, number>>({}); // one-time prompts per session
  const router = useRouter();
  const params = useSearchParams();

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

  function openAiDocFromTop() {
    act("aidoc:toggle");
    const firstCase = document.querySelector<HTMLButtonElement>('[data-aidoc="case"]');
    if (firstCase) { firstCase.click(); return; }

    const sess = typeof window !== "undefined" ? sessionStorage.getItem("aidoc_thread") : null;
    const tid = sess && sess.trim() ? sess : `aidoc_${Date.now().toString(36)}`;
    try { sessionStorage.setItem("aidoc_thread", tid); } catch {}
    const ctx = params.get("context") ?? "profile";
    router.push(`/?panel=ai-doc&threadId=${tid}&context=${ctx}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* UI mode */}
      <div className="inline-flex rounded-xl border p-1 dark:border-neutral-800">
        <button onClick={()=>act("ui:set","patient")}
          className={`px-3 py-1.5 rounded-lg ${s.ui==="patient"?"bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900":""}`}>Patient</button>
        <button onClick={()=>act("ui:set","doctor")}
          className={`px-3 py-1.5 rounded-lg ${s.ui==="doctor"?"bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900":""}`}>Doctor</button>
      </div>

      {/* Feature modes */}
      <button onClick={()=>act("therapy:toggle")}
        className={`rounded-lg border px-3 py-1.5 ${s.therapy?"bg-emerald-600 text-white":"border-neutral-300 dark:border-neutral-700"}`}>Therapy</button>

      <button onClick={()=>act("research:toggle")}
        className={`rounded-lg border px-3 py-1.5 ${s.research?"bg-blue-600 text-white":"border-neutral-300 dark:border-neutral-700"}`}>Research</button>

      <button onClick={openAiDocFromTop}
        className={`rounded-lg border px-3 py-1.5 ${s.aidoc?"bg-violet-600 text-white":"border-neutral-300 dark:border-neutral-700"}`}>AI&nbsp;Doc</button>

      <button onClick={()=>act("dark:toggle")}
        className={`rounded-lg border px-3 py-1.5 ${s.dark?"bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900":"border-neutral-300 dark:border-neutral-700"}`}>Dark</button>
    </div>
  );
}
