"use client";

import Link from "next/link";

export default function Brand() {
  return (
    <Link
      href="/"
      aria-label="MedX Home"
      onClick={() => {
        try {
          sessionStorage.removeItem("search_docked");
        } catch {}
      }}
      className="text-xl font-semibold tracking-tight"
    >
      MedX
    </Link>
  );
}
