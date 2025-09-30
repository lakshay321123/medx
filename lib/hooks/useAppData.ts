"use client";
import useSWR from "swr";

import { langBase } from "@/lib/i18n/langBase";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Cached across routes; no revalidate on focus (prevents reload on tab switch)
export function useTimeline(enabled = true, lang?: string) {
  const lb = langBase(lang);
  const params = new URLSearchParams({ mode: "ai-doc", lang: lb });
  const key = enabled ? `/api/timeline?${params.toString()}` : null;
  return useSWR<{ items: any[] }>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 1200,
    refreshInterval: 120000, // background refresh every 2 min
  });
}

export function useProfile() {
  return useSWR<any>("/api/profile", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 1200,
    refreshInterval: 120000,
  });
}
