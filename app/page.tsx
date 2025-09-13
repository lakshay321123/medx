"use client";
import SearchDock from "@/components/search/SearchDock";
import { useEffect, useRef } from "react";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from '@/store/researchFilters';

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = (searchParams.panel ?? "chat").toLowerCase();
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  useEffect(() => {
    if (panel === "ai-doc") {
      document.dispatchEvent(new CustomEvent("research-mode", { detail: false }));
      document.dispatchEvent(new CustomEvent("therapy-mode", { detail: false }));
      try { localStorage.setItem("therapyMode", "off"); } catch {}
    }
  }, [panel]);

  return (
    <main className="flex-1 overflow-y-auto content-layer">
      {/* Centered landing search; docks after first submit */}
      <SearchDock onSubmit={(q)=>window.location.assign(`/?panel=chat&q=${encodeURIComponent(q)}`)} />
      <section className={panel === "chat" ? "block h-full" : "hidden"}>
        <ResearchFiltersProvider>
          <ChatPane inputRef={chatInputRef} />
        </ResearchFiltersProvider>
      </section>

      <section className={panel === "profile" ? "block" : "hidden"}>
        <MedicalProfile />
      </section>

      <section className={panel === "timeline" ? "block" : "hidden"}>
        <Timeline />
      </section>

      <section className={panel === "alerts" ? "block" : "hidden"}>
        <AlertsPane />
      </section>

      <section className={panel === "settings" ? "block" : "hidden"}>
        <SettingsPane />
      </section>

      <section className={panel === "ai-doc" ? "block" : "hidden"}>
        <AiDocPane />
      </section>
    </main>
  );
}
