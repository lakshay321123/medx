"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { IntlProvider, useIntl } from "react-intl";
import {
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  getLocaleMeta,
  isRTL,
  loadMessages,
  matchSupportedLocale,
} from "./config";
import { pushToast } from "@/lib/ui/toast";

export type LocaleDirection = "ltr" | "rtl";

type I18nContextValue = {
  locale: SupportedLocale;
  direction: LocaleDirection;
  loading: boolean;
  available: typeof SUPPORTED_LOCALES;
  setLocale: (next: SupportedLocale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function useLocaleContext() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useLocaleContext must be used inside I18nProvider");
  }
  return value;
}

type ProviderState = {
  locale: SupportedLocale;
  messages: Record<string, string> | null;
  loading: boolean;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProviderState>({
    locale: DEFAULT_LOCALE,
    messages: null,
    loading: true,
  });

  const [initialized, setInitialized] = useState(false);

  const applyHtmlAttrs = useCallback((next: SupportedLocale) => {
    if (typeof document === "undefined") return;
    const { dir, code } = getLocaleMeta(next);
    document.documentElement.lang = code;
    document.documentElement.dir = dir;
  }, []);

  const loadLocale = useCallback(
    async (next: SupportedLocale) => {
      setState(prev => ({ ...prev, loading: true }));
      const bundle = await loadMessages(next).catch(() => null);
      if (!bundle) {
        console.warn(`Missing locale bundle for ${next}, falling back to ${DEFAULT_LOCALE}`);
        const fallback = await loadMessages(DEFAULT_LOCALE);
        setState({ locale: DEFAULT_LOCALE, messages: fallback, loading: false });
        applyHtmlAttrs(DEFAULT_LOCALE);
        return { applied: DEFAULT_LOCALE, messages: fallback } as const;
      }
      setState({ locale: next, messages: bundle, loading: false });
      applyHtmlAttrs(next);
      return { applied: next, messages: bundle } as const;
    },
    [applyHtmlAttrs],
  );

  useEffect(() => {
    if (initialized) return;
    let mounted = true;
    const detectLocale = async () => {
      let initial: SupportedLocale = DEFAULT_LOCALE;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const matchedStored = matchSupportedLocale(stored);
        if (matchedStored) {
          initial = matchedStored;
        } else {
          const candidates = Array.from(new Set([
            ...(window.navigator.languages || []),
            window.navigator.language,
          ]));
          for (const candidate of candidates) {
            const matched = matchSupportedLocale(candidate);
            if (matched) {
              initial = matched;
              break;
            }
          }
        }
      }
      if (!mounted) return;
      await loadLocale(initial);
      setInitialized(true);
    };
    void detectLocale();
    return () => {
      mounted = false;
    };
  }, [initialized, loadLocale]);

  const setLocale = useCallback(
    async (next: SupportedLocale) => {
      const previous = state.locale;
      if (previous === next && state.messages) return;
      const { applied, messages } = await loadLocale(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, applied);
      }
      if (applied !== previous || !state.messages) {
        const toastLabel = messages?.["language.toast"] ?? messages?.["language.updated"] ?? "Language updated";
        pushToast({ title: toastLabel });
      }
    },
    [loadLocale, state.locale, state.messages],
  );

  const value = useMemo<I18nContextValue>(() => ({
    locale: state.locale,
    direction: isRTL(state.locale) ? "rtl" : "ltr",
    loading: state.loading || !state.messages,
    available: SUPPORTED_LOCALES,
    setLocale,
  }), [setLocale, state.locale, state.loading, state.messages]);

  return (
    <I18nContext.Provider value={value}>
      <IntlProvider
        locale={state.locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={state.messages ?? {}}
        onError={(err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("i18n error", err);
          }
        }}
      >
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const intl = useIntl();
  const { locale, direction, loading, available, setLocale } = useLocaleContext();
  return useMemo(
    () => ({
      locale,
      direction,
      loading,
      available,
      setLocale,
      formatMessage: intl.formatMessage,
      formatNumber: intl.formatNumber,
      formatDate: intl.formatDate,
    }),
    [available, direction, intl.formatDate, intl.formatMessage, intl.formatNumber, loading, locale, setLocale],
  );
}
