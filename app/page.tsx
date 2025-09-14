"use client";
import { useRef } from "react";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = searchParams.panel?.toLowerCase();
  const threadId = searchParams.threadId;
  const chatInputRef = useRef<HTMLInputElement>(null);

  const sendQuery = (q: string) => {
    window.location.href = `/chat?q=${encodeURIComponent(q)}`;
  };

  if (!panel) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <SearchDock onSubmit={sendQuery} />
      </div>
    );
  }

  return (
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
  );
}
