import React from "react";
import ChatMarkdown from "@/components/ChatMarkdown";
import { stripNumericCitations } from "@/utils/stripCitations";
import { SourceChips, type Cite } from "./SourceChips";

export function AssistantContent({
  text,
  citations
}: {
  text: string;
  citations?: Cite[];
}) {
  const clean = stripNumericCitations(text ?? "");
  return (
    <div className="so-assistant">
      <div className="so-body">
        <ChatMarkdown content={clean} />
      </div>
      <SourceChips items={citations} />
    </div>
  );
}
