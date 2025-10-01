"use client";

import TrialsPane from "@/components/panels/TrialsPane";
import { useT } from "@/components/hooks/useI18n";

export default function ResearchPane() {
  const t = useT();
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">{t("Clinical Trials")}</h3>
        <TrialsPane />
      </section>
    </div>
  );
}
