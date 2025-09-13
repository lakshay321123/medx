"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";

export default function Page({ searchParams }: { searchParams: { panel?: string; threadId?: string } }) {
  const router = useRouter();
  const panel = (searchParams.panel ?? "chat").toLowerCase();
  const threadId = searchParams.threadId;
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  return (
    <>
      <SearchDock onSubmit={(q)=>router.push(`/?panel=chat&q=${encodeURIComponent(q)}`)} />
      <main className="flex-1 overflow-y-auto content-layer">
        {panel === "chat" && (
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        )}
        {panel === "profile" && <MedicalProfile />}
        {panel === "timeline" && <Timeline />}
        {panel === "alerts" && <AlertsPane />}
        {panel === "settings" && <SettingsPane />}
        {panel === "ai-doc" && <AiDocPane threadId={threadId} />}
      </main>
    </>
  );
}
