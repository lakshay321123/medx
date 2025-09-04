import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";

export default function Page({
  searchParams,
}: { searchParams: { panel?: string; threadId?: string } }) {
  const panel = (searchParams.panel ?? "chat") as
    | "chat"
    | "profile"
    | "timeline"
    | "alerts"
    | "settings";
  const threadId = searchParams.threadId ?? "default";

  switch (panel) {
    case "profile":
      return <MedicalProfile />;
    case "timeline":
      return <Timeline threadId={threadId} />;
    case "alerts":
      return <AlertsPane />;
    case "settings":
      return <SettingsPane />;
    default:
      return <ChatPane threadId={threadId} />;
  }
}
