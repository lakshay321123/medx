import React, { ReactNode } from "react";
import { SnapshotCard, MetricCompareCard } from "@/components/aidoc/SnapshotCard";

type ThreadLike = { type?: string } | null | undefined;
type MessageLike = { metadata?: { kind?: string } | null; payload?: unknown } | null | undefined;

export function AidocRenderer({
  thread,
  message,
  fallback,
}: {
  thread?: ThreadLike;
  message?: MessageLike;
  fallback: React.ReactNode;
}) {
  const isAidoc = thread?.type === "aidoc";
  const metaKind = message?.metadata?.kind;
  const payload = message?.payload as any;

  if (isAidoc && metaKind === "patient_snapshot" && payload?.type === "patient_snapshot") {
    return <SnapshotCard payload={payload} />;
  }

  if (isAidoc && metaKind === "metric_compare" && payload?.type === "metric_compare") {
    return <MetricCompareCard payload={payload} />;
  }

  return <>{fallback}</>;
}

export const Renderer = {
  h1: ({ children }: { children: ReactNode }) => (
    <h1 className="text-lg font-semibold">{children}</h1>
  ),
  ul: ({ children }: { children: ReactNode }) => (
    <ul className="ml-4 list-disc space-y-1">{children}</ul>
  ),
};
