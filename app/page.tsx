import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import { Suspense } from "react";

export default function Page({ searchParams }: { searchParams: { panel?: string; threadId?: string } }) {
  const panel = (searchParams.panel ?? "chat") as "chat"|"profile"|"timeline"|"alerts"|"settings";
  const threadId = searchParams.threadId ?? "default";

  return (
    <>
      {panel === "chat" && <ChatPane threadId={threadId} />}
      {panel === "profile" && <MedicalProfile />}
      {panel === "timeline" && (
        <Suspense fallback={null}>
          <Timeline threadId={threadId} />
        </Suspense>
      )}
      {panel === "alerts" && <AlertsPane />}
      {panel === "settings" && <SettingsPane />}
    </>
  );
}
