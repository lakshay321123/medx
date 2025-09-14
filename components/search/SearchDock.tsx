"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchDock() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        router.push(`/?panel=chat&query=${encodeURIComponent(v)}`);
      }}
      className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-lg"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask MedX…"
        className="w-full rounded-2xl bg-transparent px-5 py-4 text-base outline-none"
      />
    </form>
  );
}

