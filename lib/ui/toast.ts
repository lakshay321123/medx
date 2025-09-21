export type AppToastDetail = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const APP_TOAST_EVENT = "app-toast";

export function pushToast(detail: AppToastDetail) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, {
    detail,
  });
  window.dispatchEvent(event);
}
