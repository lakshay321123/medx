import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";
import type { Metadata } from "next";

const FEATURE_ENABLED =
  process.env.FEATURE_DIRECTORY === "1" || process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1";

const DirectoryView = dynamic(() => import("@/components/directory/DirectoryView"), {
  ssr: false,
  loading: () => <div className="flex flex-1 items-center justify-center">Loading directory…</div>,
});

export const metadata: Metadata = {
  title: `Directory | ${BRAND_NAME}`,
};

export default function DirectoryPage() {
  if (!FEATURE_ENABLED) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <DirectoryView />
    </div>
  );
}
