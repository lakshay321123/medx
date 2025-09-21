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

  if (normalized === "chat") {
    return (
      <div className="flex w-full flex-1 min-h-0 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-1 min-h-0 flex-col rounded-2xl p-6 ring-1 bg-white/80 dark:bg-slate-900/60 ring-black/5 dark:ring-white/10">
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        </div>
      </div>
    );
  }

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
      default:
        return <ChatPane inputRef={chatInputRef} />;
    }
  }, [normalized, chatInputRef]);

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="rounded-2xl p-6 ring-1 bg-white/80 dark:bg-slate-900/60 ring-black/5 dark:ring-white/10">
          {content}
        </div>
      </div>
    </div>
  );
}
