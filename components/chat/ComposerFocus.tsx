import { useEffect } from "react";
import type { Suggestion } from "@/lib/chat/suggestions";

export default function ComposerFocus({ suggestions, composerRef }: { suggestions: Suggestion[]; composerRef: any }) {
  useEffect(() => {
    if (suggestions?.some((s) => !s.actionId)) {
      composerRef.current?.focus?.();
      composerRef.current?.setPlaceholder?.("Answer here (duration, other symptoms, meds…)");
    }
  }, [suggestions, composerRef]);
  return null;
}
