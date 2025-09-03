import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = (searchParams.panel ?? "chat").toLowerCase();

  switch (panel) {
    case "chat":
      return <ChatPane />;
    case "profile":
      return <MedicalProfile />;
    case "timeline":
      return <Timeline threadId={searchParams.threadId} />;
    case "alerts":
      return <AlertsPane />;
    case "settings":
      return <SettingsPane />;
    default:
      return <ChatPane />;
  }
}
