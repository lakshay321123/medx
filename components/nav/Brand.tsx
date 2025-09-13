"use client";

import Link from "next/link";

export default function Brand() {
  return (
    <Link
      href="/"
      aria-label="MedX Home"
      onClick={() => sessionStorage.removeItem("search_docked")}
      className="text-xl font-bold tracking-tight"
    >
      MedX
    </Link>
  );
}
