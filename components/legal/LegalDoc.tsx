"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { usePrefs } from "@/components/providers/PreferencesProvider";

type DocKey = "privacy" | "cookies" | "terms";

const MODS = {
  privacy: {
    en: () => import("@/content/legal/privacy.en.mdx"),
    hi: () => import("@/content/legal/privacy.hi.mdx"),
    ar: () => import("@/content/legal/privacy.ar.mdx"),
    it: () => import("@/content/legal/privacy.it.mdx"),
    zh: () => import("@/content/legal/privacy.zh.mdx"),
    es: () => import("@/content/legal/privacy.es.mdx"),
  },
  cookies: {
    en: () => import("@/content/legal/cookies.en.mdx"),
    hi: () => import("@/content/legal/cookies.hi.mdx"),
    ar: () => import("@/content/legal/cookies.ar.mdx"),
    it: () => import("@/content/legal/cookies.it.mdx"),
    zh: () => import("@/content/legal/cookies.zh.mdx"),
    es: () => import("@/content/legal/cookies.es.mdx"),
  },
  terms: {
    en: () => import("@/content/legal/terms.en.mdx"),
    hi: () => import("@/content/legal/terms.hi.mdx"),
    ar: () => import("@/content/legal/terms.ar.mdx"),
    it: () => import("@/content/legal/terms.it.mdx"),
    zh: () => import("@/content/legal/terms.zh.mdx"),
    es: () => import("@/content/legal/terms.es.mdx"),
  },
} as const;

type Loader = () => Promise<{ default: ComponentType<any> }>;

type LegalDocProps = {
  doc: DocKey;
};

export default function LegalDoc({ doc }: LegalDocProps) {
  const { lang, dir } = usePrefs();
  const loaders = MODS[doc];
  const loader = (loaders[lang as keyof typeof loaders] ?? loaders.en) as Loader;
  const Mdx = dynamic(loader, {
    ssr: false,
    loading: () => <div className="p-6 text-sm opacity-70">…</div>,
  });

  return (
    <div dir={dir} className="prose max-w-3xl px-6 py-8 dark:prose-invert">
      <Mdx />
    </div>
  );
}
