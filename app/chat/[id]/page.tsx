"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { hydrateFromLocalStorage } from "@/lib/state/hydrate";
import ThreadView from "@/components/ThreadView";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    hydrateFromLocalStorage(id);
  }, [id]);

  return <ThreadView id={id} />;
}

