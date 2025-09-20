"use client";
import { useQuery } from "@tanstack/react-query";
import { useIsAiDocMode } from "@/hooks/useIsAiDocMode";

export function useReports(userId?: string) {
  const isAiDoc = useIsAiDocMode();

  return useQuery({
    queryKey: ["reports", userId],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: "ai-doc" });
      if (userId) params.set("userId", userId);
      const r = await fetch(`/api/reports?${params.toString()}`);
      if (!r.ok) throw new Error("Reports API blocked outside AI Doc");
      return r.json();
    },
    enabled: !!userId && isAiDoc,
    staleTime: 5 * 60 * 1000,
  });
}
