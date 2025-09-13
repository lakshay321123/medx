import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import TimelinePane from "@/components/panels/TimelinePane";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import SearchDockClient from "@/components/search/SearchDockClient";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = (searchParams.panel ?? "chat").toLowerCase();
  const threadId = searchParams.threadId as string | undefined;

  return (
    <>
      <SearchDockClient />
      <main className="flex-1 overflow-y-auto">
        {panel === "chat" && <ChatPane />}
        {panel === "profile" && <MedicalProfile />}
        {panel === "timeline" && <TimelinePane />}
        {panel === "alerts" && <AlertsPane />}
        {panel === "settings" && <SettingsPane />}
        {panel === "ai-doc" && <AiDocPane threadId={threadId} />}
      </main>
    </>
  );
}
