export type AnalyticsEventName =
  | "copy_clicked"
  | "refresh_clicked"
  | "share_opened"
  | "share_copy_link"
  | "share_download_image"
  | "share_x"
  | "share_facebook"
  | "share_system"
  | "feedback_submitted";

const ANALYTICS_EVENT = "medx:analytics";

export function trackEvent(name: AnalyticsEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const detail = { name, payload, timestamp: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail }));
  } catch {}

  try {
    const analytics = (window as unknown as { analytics?: { track?: (event: string, data?: Record<string, unknown>) => void } }).analytics;
    analytics?.track?.(name, payload);
  } catch {}

  try {
    const dataLayer = (window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer;
    if (Array.isArray(dataLayer)) {
      dataLayer.push({ event: name, ...payload, timestamp: detail.timestamp });
    }
  } catch {}
}
