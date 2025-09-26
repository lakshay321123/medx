export type AnalyticsEventDetail = {
  event: string;
  payload?: Record<string, unknown>;
};

const ANALYTICS_EVENT_NAME = "medx:analytics";

declare global {
  interface Window {
    medxAnalytics?: (event: string, payload?: Record<string, unknown>) => void;
  }
}

export function trackAnalyticsEvent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent<AnalyticsEventDetail>(ANALYTICS_EVENT_NAME, {
      detail: { event, payload },
    }));
  } catch (error) {
    // Silent no-op; avoid breaking UX if analytics bridge is unavailable
  }

  try {
    if (typeof window.medxAnalytics === "function") {
      window.medxAnalytics(event, payload);
    }
  } catch (error) {
    // Ignore downstream analytics errors
  }
}
