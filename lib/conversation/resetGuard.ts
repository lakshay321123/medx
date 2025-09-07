export function shouldReset(userMsg: string): boolean {
  const m = userMsg.trim().toLowerCase();
  return ["reset", "start over", "new chat", "clear chat"].includes(m);
}
