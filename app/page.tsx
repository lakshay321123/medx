"use client";
import { useEffect, useRef } from "react";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
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

  return (
    <>
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
    </>
  );
}
