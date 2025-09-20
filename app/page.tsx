"use client";
import { Suspense } from "react";
import ShellLive from "@/components/live/ShellLive";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ShellLive />
    </Suspense>
  );
}
