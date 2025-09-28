"use client";

import { usePrefs } from "@/components/providers/PreferencesProvider";
import { legal } from "@/content/legal/legalContent";

type DocKey = "privacy" | "cookies" | "terms";

type LegalDocProps = {
  doc: DocKey;
};

export default function LegalDoc({ doc }: LegalDocProps) {
  const { lang, dir } = usePrefs();
  const html = legal[doc]?.[lang] || legal[doc]?.en || "";

  return (
    <div
      dir={dir}
      className="prose max-w-3xl px-6 py-8 dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
