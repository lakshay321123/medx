"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchDock() {
  const [q, setQ] = useState("");
  const [docked, setDocked] = useState<boolean>(
    () => typeof window !== "undefined" && !!sessionStorage.getItem("search_docked")
  );
  const router = useRouter();

  useEffect(() => {
    if (docked) sessionStorage.setItem("search_docked", "1");
  }, [docked]);

  return (
    <div
      className={`fixed z-30 left-1/2 -translate-x-1/2 transition-all duration-500
    ${docked ? "bottom-4 w-[min(720px,92vw)]" : "top-1/3 w-[min(760px,92vw)]"}`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const query = q.trim();
          if (!query) return;
          router.push(`/?panel=chat&q=${encodeURIComponent(query)}`);
          setDocked(true);
        }}
        className="rounded-2xl border border-neutral-200 bg-white/90 p-2 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask MedX…"
          className="w-full rounded-xl bg-transparent px-4 py-3 outline-none"
        />
      </form>
    </div>
  );
}
