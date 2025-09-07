import Markdown from "./Markdown";
import TrialsTable from "./TrialsTable";

export default function MessageRenderer({
  message,
  mode,
  researchOn,
}: {
  message: { text: string; payload?: any };
  mode: "patient" | "doctor";
  researchOn: boolean;
}) {
  // Patient mode: NEVER render tables
  if (mode === "patient") {
    return <Markdown text={message.text} />;
  }
  // Doctor mode + Research ON: structured payload allowed
  if (mode === "doctor" && researchOn && message?.payload?.kind === "trials_table") {
    return <TrialsTable payload={message.payload} markdownFallback={message.text} />;
  }
  // Default: text only
  return <Markdown text={message.text} />;
}
