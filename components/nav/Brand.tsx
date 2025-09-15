"use client";

import { useCallback } from "react";
import Logo from "@/components/brand/Logo";

export default function Brand() {
  const handleClick = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("search_docked");
      } catch {
        // ignore storage access issues
      }
    }
  }, []);

  return (
    <span onClick={handleClick} className="inline-flex">
      <Logo />
    </span>
  );
}
