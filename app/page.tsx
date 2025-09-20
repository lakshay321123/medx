"use client";
import dynamic from "next/dynamic";
const MedXPreview = dynamic(() => import("../src/components/MedXPreview"), { ssr: false });

export default function Page() {
  return <MedXPreview />;
}
