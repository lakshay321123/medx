import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";

type Search = { panel?: string; threadId?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const raw = (searchParams.panel ?? "chat").toLowerCase();
  const allowed = new Set(["chat", "profile", "timeline", "alerts", "settings"]);
  const panel = allowed.has(raw) ? raw : "chat";
  const threadId = searchParams.threadId;

  return (
    <>
      <section className={panel === "chat" ? "block h-full" : "hidden"}>
        <ChatPane />
      </section>

      <section className={panel === "profile" ? "block" : "hidden"}>
        <MedicalProfile />
      </section>

      <section className={panel === "timeline" ? "block" : "hidden"}>
        <Timeline threadId={threadId} />
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
