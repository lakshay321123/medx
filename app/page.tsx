"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";

import AiDocPane from "@/components/panels/AiDocPane";
type Search = { panel?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = searchParams.panel?.toLowerCase();
  const chatInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  const sendQuery = (q: string) => {
    router.push(`/?panel=chat&query=${encodeURIComponent(q)}`);
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
        <section className="block h-full">
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        </section>
      )}
      {panel === "profile" && <MedicalProfile />}
      {panel === "timeline" && <Timeline />}
      {panel === "alerts" && <AlertsPane />}
      {panel === "settings" && <SettingsPane />}
      {panel === "ai-doc" && <AiDocPane />}
    </main>
  );
}
