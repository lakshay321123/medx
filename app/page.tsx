"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import Header from "@/components/Header";
import type { ModeState } from "@/lib/modes/types";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = searchParams.panel?.toLowerCase();
  const threadId = searchParams.threadId;
  const router = useRouter();
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'patient' | 'doctor'>('patient');
  const [researchMode, setResearchMode] = useState(false);
  const [therapyMode, setTherapyMode] = useState(false);

  const handleModesChange = (s: ModeState) => {
    if (s.ui === 'patient' || s.ui === 'doctor') setMode(s.ui);
    setResearchMode(s.research);
    setTherapyMode(s.therapy);
  };

  const sendQuery = (q: string) => {
    router.push(`/?panel=chat&q=${encodeURIComponent(q)}`);
  };

  if (!panel) {
    return (
      <>
        <Header onModesChange={handleModesChange} />
        <div className="min-h-[80vh] flex items-center justify-center">
          <SearchDock onSubmit={sendQuery} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header onModesChange={handleModesChange} />
      <main className="flex-1 overflow-y-auto content-layer">
        {panel === "chat" && (
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} mode={mode} researchMode={researchMode} therapyMode={therapyMode} />
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
