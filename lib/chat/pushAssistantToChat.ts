export type AssistantPushPayload = {
  content: string;
  html?: string;
};

export function pushAssistantToChat(payload: AssistantPushPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('medx:push-assistant', { detail: payload }));
}
