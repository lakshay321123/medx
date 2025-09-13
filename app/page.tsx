"use client";
import { useRouter } from "next/navigation";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import TimelinePane from "@/components/panels/TimelinePane";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";

type Search = { panel?: string; threadId?: string; q?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const router = useRouter();
  const panel = (searchParams.panel ?? "chat").toLowerCase();
  const threadId = searchParams.threadId as string | undefined;

  return (
    <>
      {/* Centered on first load; docks after first submit */}
      <SearchDock onSubmit={(q) => router.push(`/?panel=chat&q=${encodeURIComponent(q)}`)} />

      {/* Panel switch: ALWAYS render these branches */}
      {panel === "chat" && <ChatPane />}
      {panel === "profile" && <MedicalProfile />}
      {panel === "timeline" && <TimelinePane />}
      {panel === "alerts" && <AlertsPane />}
      {panel === "settings" && <SettingsPane />}
      {panel === "ai-doc" && <AiDocPane threadId={threadId} />}
    </>
  );
}

