import { Suspense } from "react";
import MainPageContent from "@/components/MainPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <MainPageContent />
    </Suspense>
  );
}
