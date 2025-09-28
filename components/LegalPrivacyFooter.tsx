"use client";

import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import LegalPrivacyModal from "@/components/legal/LegalPrivacyModal";
import { Scale } from "lucide-react";

const CONSENT_KEY = "secondopinion.consent.v1.0";
const LEGAL_NOTICE = "Second Opinion can make mistakes… Always consult a clinician.";

const parseConsentValue = (value: string | null): "true" | "false" | null => {
  if (value === null) return null;
  if (value === "true" || value === "false") return value;
  return "true";
};

export default function LegalPrivacyFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const [consentValue, setConsentValue] = useState<"true" | "false" | null>(null);
  const [agreeChecked, setAgreeChecked] = useState(false);
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
    const previousHeight = root.style.getPropertyValue("--mobile-footer-height");
    const hadPreviousHeight = previousHeight.trim().length > 0;
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
      if (hadPreviousHeight) root.style.setProperty("--mobile-footer-height", previousHeight);
      else root.style.removeProperty("--mobile-footer-height");
      if (hadPreviousSafeArea) root.style.setProperty("--mobile-footer-safe-area", previousSafeArea);
      else root.style.removeProperty("--mobile-footer-safe-area");
      if (hadPreviousOffset) root.style.setProperty("--mobile-composer-offset", previousOffset);
      else root.style.removeProperty("--mobile-composer-offset");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedConsent = parseConsentValue(window.localStorage.getItem(CONSENT_KEY));
    setConsentValue(storedConsent);
    setAgreeChecked(storedConsent === "true");
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
        setMarqueeVars(null);
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

  const openModal = () => {
    setAgreeChecked(consentValue === "true");
    setIsOpen(true);
  };

  const handleAccept = () => {
    if (!agreeChecked) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_KEY, "true");
    }
    setConsentValue("true");
    setIsOpen(false);
  };

  const handleReject = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_KEY, "false");
    }
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

      <LegalPrivacyModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        consentChecked={agreeChecked}
        onConsentChange={setAgreeChecked}
        onAccept={handleAccept}
        onReject={handleReject}
        acceptDisabled={!agreeChecked}
      />
    </>
  );
}

