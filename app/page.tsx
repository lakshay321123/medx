"use client";
import { useRouter } from "next/navigation";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import Header from "@/components/Header";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import { useRef } from "react";

interface Search {
  panel?: string;
  threadId?: string;
  context?: string;
}

export default function Page({ searchParams }: { searchParams: Search }) {
  const router = useRouter();
  const panel = (searchParams.panel ?? "").toLowerCase();
  const threadId = searchParams.threadId as string | undefined;
  const chatInputRef = useRef<HTMLInputElement>(null);

  function sendQuery(q: string) {
    router.push(`/?panel=chat&query=${encodeURIComponent(q)}`);
  }

  if (!panel) {
    return (
      <>
        <Header onChange={() => {}} />
        <div className="min-h-[80vh] flex items-center justify-center">
          <SearchDock onSubmit={sendQuery} />
        </div>
      </>
    );
  }

  return (
    <>
      {panel !== "chat" && <Header onChange={() => {}} />}
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

