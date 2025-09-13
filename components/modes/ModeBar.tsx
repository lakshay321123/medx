"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const baseBtn = "px-3.5 py-1.5 rounded-xl text-sm transition active:scale-[.98]";
const ghost   = "border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const active  = "bg-blue-600 text-white"; // same as New Chat

export default function ModeBar() {
  const router = useRouter();
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setDark(next === "dark");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={`${baseBtn} ${active}`}>Patient</button>
      <button className={`${baseBtn} ${ghost}`}>Doctor</button>
      <button className={`${baseBtn} ${ghost}`}>Therapy</button>
      <button className={`${baseBtn} ${ghost}`}>Research</button>

      {/* Top AI Doc: shortcut only; sidebar owns cases */}
      <button
        onClick={()=>router.push("/?panel=ai-doc")}
        className={`${baseBtn} ${ghost}`}
      >AI&nbsp;Doc</button>

      <button onClick={toggleTheme} className={`${baseBtn} ${dark ? active : ghost}`}>
        {dark ? "Light" : "Dark"}
      </button>
    </div>
  );
}
