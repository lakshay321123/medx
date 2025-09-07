import Markdown from "@/components/Markdown";
import TrialsTable from "@/components/TrialsTable";

export default function MessageRenderer({ message, mode }:{ message:{ text:string; payload?:any }, mode:"patient"|"doctor"|"research"}) {
  // Patient mode must never render tables
  if (mode === "patient") return <Markdown>{message.text}</Markdown>;

  // Doctor/Research: render structured table if present
  if (message?.payload?.kind === "trials_table") {
    return <TrialsTable payload={message.payload} markdownFallback={message.text} />;
  }
  return <Markdown>{message.text}</Markdown>;
}
