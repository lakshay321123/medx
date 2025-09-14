"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nextModes } from "@/lib/modes/controller";
import type { ModeState } from "@/lib/modes/types";

const initial: ModeState = { ui: "patient", therapy: false, research: false, dark: false };

export default function ModeBar({ onChange }: { onChange?: (s: ModeState)=>void }) {
  const [s, setS] = useState<ModeState>(initial);
  const router = useRouter();
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

      <button
        onClick={() => router.push('/?panel=ai-doc&threadId=med-profile&context=profile')}
        className="rounded-lg border px-3 py-1.5 border-neutral-300 dark:border-neutral-700"
      >
        AI&nbsp;Doc
      </button>

      <button onClick={()=>act("dark:toggle")}
        className={`rounded-lg border px-3 py-1.5 ${s.dark?"bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900":"border-neutral-300 dark:border-neutral-700"}`}>Dark</button>
    </div>
  );
}
