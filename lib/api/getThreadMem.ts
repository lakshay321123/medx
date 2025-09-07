export async function getThreadMem(threadId: string) {
  const res = await fetch(`/api/debug/thread-mem?threadId=${encodeURIComponent(threadId)}`, { cache: "no-store" });
  return res.json(); // { threadId, mem: {prefs,facts,redflags,goals} }
}
