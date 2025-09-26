"use client";

import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Scale } from "lucide-react";

type CookiePrefs = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

type ToggleableCookie = Exclude<keyof CookiePrefs, "essential">;

const CONSENT_KEY = "secondopinion.consent.v1.0";
const COOKIE_KEY = "secondopinion.cookies.v1.0";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Second Opinion";
const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "privacy@secondopinion.ai";
const GOVERNING_LAW =
  process.env.NEXT_PUBLIC_GOVERNING_LAW ?? "Delaware, USA";

const LEGAL_NOTICE = "Second Opinion can make mistakes… Always consult a clinician.";

const DEFAULT_PREFS: CookiePrefs = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
};

const COOKIE_DESCRIPTIONS: Record<ToggleableCookie, string> = {
  analytics: "Helps us understand usage patterns so we can improve features and reliability.",
  functional: "Remembers helpful preferences such as language, accessibility, and session context.",
  marketing: "Allows us to share relevant updates about new capabilities and clinical resources.",
};

const SECTION_COPY = [
  {
    title: "Introduction",
    body: (
      <p>
        {BRAND} provides AI-assisted health insights designed to complement conversations with
        licensed clinicians. These terms explain how we handle information, the limits of the
        service, and your choices around cookies and data use.
      </p>
    ),
  },
  {
    title: "Medical Advice Disclaimer",
    body: (
      <p>
        The chat experience does not replace personalized care from a qualified professional. Always
        seek the advice of your physician or other licensed clinician with any questions you may
        have regarding a medical condition. Never disregard professional medical advice or delay
        seeking it because of something you read here.
      </p>
    ),
  },
  {
    title: "AI Limitations",
    body: (
      <p>
        AI models can misunderstand context, omit critical information, or present outdated research.
        Double-check important findings, especially before making care decisions. Let us know if you
        spot inaccuracies so we can continue to refine our systems.
      </p>
    ),
  },
  {
    title: "Data Privacy & Storage",
    body: (
      <p>
        We store chats and uploaded content to deliver the service, detect safety issues, and
        improve product quality. Data may be processed in the United States or other jurisdictions
        with appropriate safeguards. Please avoid sharing sensitive personal details beyond what is
        required for your care questions.
      </p>
    ),
  },
];

const LIABILITY_COPY = (
  <p>
    This service is provided on an “as-is” basis without warranties of any kind. To the extent
    permitted by law, {BRAND} and its partners are not liable for damages arising from your use of
    the platform. These terms are governed by the laws of {GOVERNING_LAW}. Local
    consumer protections still apply where relevant.
  </p>
);

const CONTACT_COPY = (
  <p>
    Questions about these terms or your data? Email us at
    {" "}
    <a className="text-primary underline" href={`mailto:${PRIVACY_EMAIL}`}>
      {PRIVACY_EMAIL}
    </a>
    .
  </p>
);

const parseConsentValue = (value: string | null): "true" | "false" | null => {
  if (value === null) return null;
  if (value === "true" || value === "false") return value;
  return "true";
};

function getStoredPrefs(): CookiePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(COOKIE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<CookiePrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      essential: true,
    };
  } catch (error) {
    console.warn("Unable to parse stored cookie preferences", error);
    return DEFAULT_PREFS;
  }
}

export default function LegalPrivacyFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const [consentValue, setConsentValue] = useState<"true" | "false" | null>(null);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const footerRef = useRef<HTMLElement | null>(null);
  const marqueeContainerRef = useRef<HTMLDivElement | null>(null);
  const marqueeTextRef = useRef<HTMLSpanElement | null>(null);
  const [marqueeVars, setMarqueeVars] = useState<{ duration: number; distance: number } | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const footer = footerRef.current;
    if (!footer) return;
    const root = document.documentElement;
    const computed = window.getComputedStyle(root);
    const baseHeightRaw = computed.getPropertyValue("--mobile-footer-base-height");
    const parsedBase = Number.parseFloat(baseHeightRaw || "");
    const fallbackBase = Number.isFinite(parsedBase) ? parsedBase : 48;
    const previous = root.style.getPropertyValue("--mobile-footer-height");
    const hadPrevious = previous.trim().length > 0;
    const previousOffset = root.style.getPropertyValue("--mobile-composer-offset");
    const hadPreviousOffset = previousOffset.trim().length > 0;
    const previousSafeArea = root.style.getPropertyValue("--mobile-footer-safe-area");
    const hadPreviousSafeArea = previousSafeArea.trim().length > 0;

    const updateHeight = () => {
      const rect = footer.getBoundingClientRect();
      const measured = Math.max(Math.round(rect.height), 0);
      const next = Math.max(fallbackBase, measured);
      const rootStyles = window.getComputedStyle(root);
      const fontSizeRaw = rootStyles.fontSize;
      const fontSize = Number.parseFloat(fontSizeRaw || "") || 16;
      const footerStyles = window.getComputedStyle(footer);
      const safeInsetRaw = footerStyles.paddingBottom;
      const safeInset = Number.parseFloat(safeInsetRaw || "") || 0;
      const offset = Math.max(Math.round(fontSize * 1.5), safeInset + 24);
      root.style.setProperty("--mobile-footer-height", `${next}px`);
      root.style.setProperty("--mobile-footer-safe-area", `${safeInset}px`);
      root.style.setProperty("--mobile-composer-offset", `${offset}px`);
      window.dispatchEvent(
        new CustomEvent("mobile-footer-height-change", {
          detail: { height: next, offset },
        }),
      );
    };

    updateHeight();

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateHeight);
    };

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(footer);
    }
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      if (observer) observer.disconnect();
      if (hadPrevious) root.style.setProperty("--mobile-footer-height", previous);
      else root.style.removeProperty("--mobile-footer-height");
      if (hadPreviousSafeArea) root.style.setProperty("--mobile-footer-safe-area", previousSafeArea);
      else root.style.removeProperty("--mobile-footer-safe-area");
      if (hadPreviousOffset) root.style.setProperty("--mobile-composer-offset", previousOffset);
      else root.style.removeProperty("--mobile-composer-offset");
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedConsentRaw = window.localStorage.getItem(CONSENT_KEY);
    const parsedConsent = parseConsentValue(storedConsentRaw);
    const storedPrefs = getStoredPrefs();

    setCookiePrefs(storedPrefs);
    setConsentValue(parsedConsent);
    setAgreeChecked(parsedConsent === "true");

    if (parsedConsent === null) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    const container = marqueeContainerRef.current;
    const text = marqueeTextRef.current;
    if (!container || !text) return;

    const gap = 48;
    let frame = 0;

    const measure = () => {
      const containerWidth = container.clientWidth;
      const textWidth = text.scrollWidth;
      if (textWidth > containerWidth && containerWidth > 0) {
        const distance = textWidth + gap;
        const duration = Math.min(32, Math.max(16, distance / 18));
        setMarqueeVars(current => {
          if (current && current.distance === distance && current.duration === duration) {
            return current;
          }
          return { distance, duration };
        });
      } else {
        setMarqueeVars(current => (current ? null : current));
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    schedule();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(schedule);
      observer.observe(container);
      observer.observe(text);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const toggleCookie = (key: ToggleableCookie) => {
    setCookiePrefs(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAccept = () => {
    if (!agreeChecked) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_KEY, "true");
      window.localStorage.setItem(COOKIE_KEY, JSON.stringify(cookiePrefs));
    }
    setConsentValue("true");
    setIsOpen(false);
  };

  const openModal = () => {
    if (typeof window !== "undefined") {
      setCookiePrefs(getStoredPrefs());
    }
    setAgreeChecked(consentValue === "true");
    setIsOpen(true);
  };

  const cookieToggles = useMemo(
    () =>
      (Object.keys(COOKIE_DESCRIPTIONS) as ToggleableCookie[]).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        description: COOKIE_DESCRIPTIONS[key],
        value: cookiePrefs[key],
        labelId: `cookie-${key}-label`,
        descriptionId: `cookie-${key}-description`,
      })),
    [cookiePrefs]
  );

  const handleReject = () => {
    if (typeof window !== "undefined") {
      const essentialOnly: CookiePrefs = {
        ...DEFAULT_PREFS,
      };
      window.localStorage.setItem(CONSENT_KEY, "false");
      window.localStorage.setItem(COOKIE_KEY, JSON.stringify(essentialOnly));
    }
    setCookiePrefs({ ...DEFAULT_PREFS });
    setConsentValue("false");
    setAgreeChecked(false);
    setIsOpen(false);
  };

  return (
    <>
      <footer
        ref={footerRef}
        className="mobile-footer flex-shrink-0 border-t border-black/10 bg-white/80 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        <div className="mobile-footer-inner mx-auto flex w-full max-w-screen-2xl items-center justify-center gap-1.5 px-6 text-center text-[11px] text-slate-600 dark:text-slate-300 md:gap-3 md:py-1.5 md:text-xs">
          <div
            ref={marqueeContainerRef}
            className={`mobile-footer-message${marqueeVars ? " mobile-footer-marquee-active" : ""}`}
            style={
              marqueeVars
                ? ({
                    ["--mobile-footer-marquee-duration" as const]: `${marqueeVars.duration}s`,
                    ["--mobile-footer-marquee-distance" as const]: `-${marqueeVars.distance}px`,
                  } as CSSProperties)
                : undefined
            }
          >
            <div className="mobile-footer-marquee-track">
              <span ref={marqueeTextRef} className="mobile-footer-marquee-segment">
                {LEGAL_NOTICE}
              </span>
              {marqueeVars ? (
                <span aria-hidden="true" className="mobile-footer-marquee-segment">
                  {LEGAL_NOTICE}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="mobile-icon-btn mobile-footer-icon"
            aria-label="View legal & privacy"
          >
            <Scale className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-privacy-title"
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-black/5 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-slate-900/40">
              <h2 id="legal-privacy-title" className="text-lg font-semibold text-primary">
                Legal &amp; Privacy
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800/80 dark:focus-visible:ring-offset-slate-900"
                aria-label="Close dialog"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="px-5 pb-5 pt-4">
              <div className="max-h-[50vh] space-y-6 overflow-y-auto pr-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {SECTION_COPY.map(section => (
                  <section key={section.title}>
                    <h3 className="mb-2 text-base font-semibold text-primary">{section.title}</h3>
                    <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{section.body}</div>
                  </section>
                ))}

                <section>
                  <h3 className="mb-2 text-base font-semibold text-primary">Cookies &amp; Tracking</h3>
                  <p className="mb-3">
                    We use cookies to keep the service secure, measure performance, and remember your
                    preferences. Essential cookies are always on. You can update other categories at
                    any time below.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-black/5 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-900/40">
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Essential</div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Required for security, basic functionality, and storing your cookie preferences.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                          On
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Required</span>
                      </div>
                    </div>

                    {cookieToggles.map(option => (
                      <div
                        key={option.key}
                        className="flex items-start justify-between gap-4 rounded-lg border border-black/5 bg-white/70 p-3 transition dark:border-white/10 dark:bg-slate-900/40"
                      >
                        <div>
                          <span
                            id={option.labelId}
                            className="block text-sm font-medium capitalize text-slate-700 dark:text-slate-200"
                          >
                            {option.label}
                          </span>
                          <p
                            id={option.descriptionId}
                            className="text-sm text-slate-600 dark:text-slate-300"
                          >
                            {option.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={option.value}
                          aria-labelledby={option.labelId}
                          aria-describedby={option.descriptionId}
                          onClick={() => toggleCookie(option.key)}
                          onKeyDown={event => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleCookie(option.key);
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                            option.value
                              ? "bg-primary"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              option.value ? "translate-x-5" : "translate-x-1"
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-base font-semibold text-primary">Liability &amp; Governing Law</h3>
                  <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{LIABILITY_COPY}</div>
                </section>

                <section>
                  <h3 className="mb-2 text-base font-semibold text-primary">Contact</h3>
                  <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{CONTACT_COPY}</div>
                </section>
              </div>

              <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
                <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-slate-400 text-primary focus:ring-blue-500 focus:ring-offset-0 dark:focus:ring-sky-400"
                    checked={agreeChecked}
                    onChange={event => setAgreeChecked(event.target.checked)}
                  />
                  <span>
                    I agree to the Legal &amp; Privacy terms, including the handling of my data and cookie
                    preferences as described above.
                  </span>
                </label>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                  >
                    Reject Non-Essential
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={!agreeChecked}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-sky-400/90 dark:focus-visible:ring-offset-slate-900"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
