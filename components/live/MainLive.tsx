"use client";
import { RefObject, useMemo } from "react";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";

type MainLiveProps = {
  panel: string;
  chatInputRef: RefObject<HTMLInputElement>;
};

export default function MainLive({ panel, chatInputRef }: MainLiveProps) {
  const normalized = panel.toLowerCase();

  const content = useMemo(() => {
    switch (normalized) {
      case "profile":
        return <MedicalProfile />;
      case "timeline":
        return <Timeline />;
      case "alerts":
        return <AlertsPane />;
      case "settings":
        return <SettingsPane />;
      case "ai-doc":
        return <AiDocPane />;
      case "chat":
      default:
        return (
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        );
    }
  }, [normalized, chatInputRef]);

  return (
    <div className="m-6 flex-1 overflow-hidden">
      <div className="h-full rounded-2xl p-6 ring-1 bg-white/80 dark:bg-slate-900/60 ring-black/5 dark:ring-white/10 flex flex-col">
        {content}
      </div>
    </div>
  );
}
