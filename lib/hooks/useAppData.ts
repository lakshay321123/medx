"use client";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Cached across routes; no revalidate on focus (prevents reload on tab switch)
export function useTimeline(enabled = true) {
  const key = enabled ? "/api/timeline?mode=ai-doc" : null;
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
