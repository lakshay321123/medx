"use client";

import Link from "next/link";

export default function Brand() {
  return (
    <Link
      href="/"
      className="text-xl font-semibold tracking-tight"
      onClick={() => {
        try { sessionStorage.removeItem("search_docked"); } catch {}
      }}
    >
      MedX
    </Link>
  );
}
