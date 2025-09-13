"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { nextModes, ModeState } from "@/lib/modes/controller";

const baseBtn = "px-3.5 py-1.5 rounded-xl text-sm transition active:scale-[.98]";
const ghost   = "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const active  = "bg-blue-600 text-white"; // match “New Chat”

export default function ModeBar() {
  const router = useRouter();
  const [s, setS] = useState<ModeState>(() => ({
    ui: "patient",
    therapy: false,
    research: false,
    aidoc: false,
    dark: typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  }));
  const promptedRef = useRef<Record<string, boolean>>({});

  function act(type: string, value?: any) {
    const { state, prompt } = nextModes(s, { type, value });
    setS(state);
    if (prompt && !promptedRef.current[prompt]) {
      promptedRef.current[prompt] = true;
      document.dispatchEvent(new CustomEvent("toast", { detail: { text: prompt } }));
    }
  }

  function setPatient(){ act("aidoc:set", false); act("ui:set","patient"); }
  function setDoctor(){ act("aidoc:set", false); act("ui:set","doctor"); }
  function toggleTheme(){
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    act("dark:set", next === "dark");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={`${baseBtn} ${s.ui==="patient"?active:ghost}`} onClick={setPatient}>Patient</button>
      <button className={`${baseBtn} ${s.ui==="doctor"?active:ghost}`} onClick={setDoctor}>Doctor</button>

      <button
        className={`${baseBtn} ${s.therapy?active:ghost}`}
        onClick={()=>act("therapy:toggle")}
      >Therapy</button>

      <button
        className={`${baseBtn} ${s.research?active:ghost}`}
        onClick={()=>act("research:toggle")}
      >Research</button>

      {/* Top AI Doc is a shortcut only; it never owns logic */}
      <button
        className={`${baseBtn} ${ghost}`}
        onClick={()=>{ act("aidoc:set", true); router.push("/?panel=ai-doc"); }}
      >AI&nbsp;Doc</button>

      <button className={`${baseBtn} ${s.dark?active:ghost}`} onClick={toggleTheme}>{s.dark ? "Light" : "Dark"}</button>
    </div>
  );
}
