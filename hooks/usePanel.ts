"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function usePanel(defaultPanel = "chat") {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const panel = params.get("panel") || defaultPanel;

  function setPanel(next: string) {
    const usp = new URLSearchParams(params);
    usp.set("panel", next);
    router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
  }

  return { panel, setPanel };
}
