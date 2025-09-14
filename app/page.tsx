"use client";
import ModeBar from "@/components/modes/ModeBar";
import SearchDock from "@/components/search/SearchDock";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import AiDocPane from "@/components/panels/AiDocPane";

type Search = { panel?: string; threadId?: string; q?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = (searchParams.panel ?? "chat").toLowerCase();
  const threadId = searchParams.threadId; // currently unused
  const initialQ = searchParams.q ?? "";

  return (
    <>
      <ModeBar />
      <SearchDock />
      <main className="flex-1 overflow-y-auto content-layer">
        {panel === "chat" && (
          <section className="block h-full">
            <ResearchFiltersProvider>
              <ChatPane initialQuery={initialQ} />
            </ResearchFiltersProvider>
          </section>
        )}
        {panel === "profile" && <MedicalProfile />}
        {panel === "timeline" && <Timeline />}
        {panel === "alerts" && <AlertsPane />}
        {panel === "settings" && <SettingsPane />}
        {panel === "ai-doc" && <AiDocPane />}
      </main>
    </>
  );
}
