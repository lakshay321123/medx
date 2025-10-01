import { useChatStore } from "@/lib/state/chatStore";

export async function persistIfTemp() {
  const { currentId, threads, upsertThread } = useChatStore.getState();
  if (!currentId) return;
  const t = threads[currentId];
  if (!t?.isTemp) return;
  // call your existing create-thread endpoint
  const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ title: t.title }) });
  try {
    await res.json();
  } catch {
    throw new Error("Network error");
  }
  // If you want to swap ids, you can re-key; else just clear isTemp:
  upsertThread({ id: currentId, isTemp: false });
}

