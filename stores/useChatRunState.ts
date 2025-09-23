import { create } from 'zustand';

type AbortHandler = (() => void) | null;

type ChatRunState = {
  streamActive: boolean;
  queueActive: boolean;
  isBusy: boolean;
  abortHandler: AbortHandler;
  setStreamActive: (active: boolean) => void;
  setQueueActive: (active: boolean) => void;
  setAbortHandler: (handler: AbortHandler) => void;
  abortAll: () => void;
};

export const useChatRunState = create<ChatRunState>((set, get) => ({
  streamActive: false,
  queueActive: false,
  isBusy: false,
  abortHandler: null,
  setStreamActive: (active) =>
    set((state) => ({
      streamActive: active,
      isBusy: active || state.queueActive,
    })),
  setQueueActive: (active) =>
    set((state) => ({
      queueActive: active,
      isBusy: active || state.streamActive,
    })),
  setAbortHandler: (handler) => set({ abortHandler: handler ?? null }),
  abortAll: () => {
    const handler = get().abortHandler;
    if (handler) {
      handler();
    }
    set({ streamActive: false, queueActive: false, isBusy: false });
  },
}));
