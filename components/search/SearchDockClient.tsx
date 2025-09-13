"use client";
import { useRouter } from "next/navigation";
import SearchDock from "./SearchDock";

export default function SearchDockClient() {
  const router = useRouter();
  return <SearchDock onSubmit={q => router.push(`/?panel=chat&query=${encodeURIComponent(q)}`)} />;
}
