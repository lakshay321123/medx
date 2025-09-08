import Markdown from "react-markdown";
import FeedbackControls from "./FeedbackControls";
import { LinkBadge } from "@/components/SafeLink";

interface MessageProps {
  message: { id: string; text: string; citations?: any[] };
}

export function ResearchBundle({ citations = [] }: { citations: any[] }) {
  if (!citations.length) return null;

  const groups = {
    PUBMED: [] as any[], EUROPEPMC: [] as any[], OPENALEX: [] as any[],
    TRIALS: [] as any[], WEB: [] as any[], OTHER: [] as any[],
  };

  citations.forEach(c => {
    const s = String(c.source || "").toUpperCase();
    if (s.includes("PUBMED")) groups.PUBMED.push(c);
    else if (s.includes("EURO")) groups.EUROPEPMC.push(c);
    else if (s.includes("OPENALEX")) groups.OPENALEX.push(c);
    else if (s.includes("TRIAL")) groups.TRIALS.push(c);
    else if (s.includes("WEB")) groups.WEB.push(c);
    else groups.OTHER.push(c);
  });

  const order = ["PUBMED","EUROPEPMC","OPENALEX","TRIALS","WEB","OTHER"];

  return (
    <div className="mt-3 rounded-lg border p-3 bg-white/60 dark:bg-slate-900/40">
      <div className="text-xs font-semibold mb-2">Research</div>
      <div className="space-y-2">
        {order.map(key => groups[key as keyof typeof groups].length ? (
          <div key={key}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{key}</div>
            <div className="flex flex-wrap gap-2">
              {groups[key as keyof typeof groups].map((c, i) => (
                <LinkBadge key={key+i} href={c.url} title={c.title} />
              ))}
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

export default function Message({ message }: MessageProps) {
  return (
    <div>
      <Markdown>{message.text}</Markdown>
      <ResearchBundle citations={message.citations} />
      <div className="mt-2">
        <FeedbackControls messageId={message.id} />
      </div>
    </div>
  );
}
