import { useEffect } from "react";

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;
    const doc = document.documentElement;
    const prev = doc.style.overflow;
    doc.style.overflow = "hidden";
    return () => {
      doc.style.overflow = prev || "";
    };
  }, [lock]);
}
